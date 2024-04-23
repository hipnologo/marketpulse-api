// backend/database.js
require('dotenv').config(); // require('dotenv').config({ path: 'path/to/your/.env' });
const DATABASE = process.env.DATABASE;

let db;
let saveFunction;
let loadFunction;

if (DATABASE) {
    // Based on the value of DATABASE, initialize the appropriate database
    if (DATABASE === 'sqlite') {
        const sqlite3 = require('sqlite3').verbose();
        db = new sqlite3.Database('marketpulse.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('SQLite error:', err.message);
            } else {
                console.log('Connected to the SQLite database.');
                db.run(`
                    CREATE TABLE IF NOT EXISTS articles (
                        title TEXT,
                        description TEXT,
                        url TEXT,
                        sentiment REAL,
                        sentimentAnalysis INTEGER,
                        naturalAnalysis REAL,
                        normalizedSentiment REAL,
                        sentimentLabel TEXT
                    )`);
            }
        });
    
        saveFunction = async (articles) => {
            articles.forEach(article => {
                db.run('INSERT OR IGNORE INTO articles VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                    article.title,
                    article.description,
                    article.url,
                    article.sentiment,
                    article.sentimentAnalysis,
                    article.naturalAnalysis,
                    article.normalizedSentiment,
                    article.sentimentLabel
                ]);
            });
        };

        loadFunction = async () => {
            return new Promise((resolve, reject) => {
                db.all("SELECT * FROM articles", [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        };
        
    } else if (DATABASE === 'supabase') {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('Connected to the Supabase database.');   

        saveFunction = async (articles) => {
            try {
                for (let article of articles) {
                    const { data, error } = await supabase
                        .from('articles')
                        // .insert([{
                        //     title: article.title,
                        //     description: article.description,
                        //     url: article.url,
                        //     sentiment: article.sentiment,
                        //     sentimentanalysis: article.sentimentAnalysis,  // Changed to lowercase
                        //     naturalanalysis: article.naturalAnalysis || null,  // Changed to lowercase
                        //     normalizedsentiment: article.normalizedSentiment,  // Changed to lowercase
                        //     sentimentlabel: article.sentimentLabel  // Changed to lowercase
                        // }], { upsert: true });
                        .upsert({  // This uses upsert, which should ideally handle duplicates
                            title: article.title,
                            description: article.description,
                            url: article.url,
                            sentiment: article.sentiment,
                            sentimentanalysis: article.sentimentAnalysis,
                            naturalanalysis: article.naturalAnalysis || null,
                            normalizedsentiment: article.normalizedSentiment,
                            sentimentlabel: article.sentimentLabel
                        }, {
                            onConflict: "url"  // This tells Supabase to update the record if a conflict on the 'url' column occurs
                        });
        
                    if (error) {
                        throw error;
                    }
                }
            } catch (err) {
                console.error('Supabase error:', err.message);
            }
        }; 

        // In database.js, under the Supabase setup
        loadFunction = async () => {
            try {
                const { data, error } = await supabase.from('articles').select('*');
                if (error) {
                    console.error('Supabase load error:', error);
                    throw error;
                }
                console.log('Loaded articles from Supabase:', data);  // Log the fetched data
                return data;
            } catch (error) {
                console.error('Error loading articles from Supabase:', error.message);
                throw error;  // Ensure this error is caught and handled appropriately
            }
        };    

    } else if (DATABASE === 'mongodb') {
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const client = new MongoClient(uri);
    
        (async () => {
            try {
                await client.connect();
                db = client.db("marketpulse");
                console.log('Connected to the MongoDB database.');
                
                const collection = db.collection("articles");
                await collection.createIndex({ "url": 1 }, { unique: true });
        
                saveFunction = async (articles) => {
                    for (let article of articles) {
                        await collection.updateOne(
                            { url: article.url },
                            { $set: article },
                            { upsert: true }
                        );
                    }
                };

                loadFunction = async () => {
                    const articles = await collection.find({}).toArray();
                    return articles;
                };

            } catch (err) {
                console.error('MongoDB error:', err);
            }
        })();
    } else if (DATABASE === 'duckdb') {
        const duckdb = require('duckdb');
        db = new duckdb.Database('marketpulse.duckdb');

        saveFunction = async (articles) => {
            const con = db.connect();
            try {
                await con.run(`
                    CREATE TABLE IF NOT EXISTS articles (
                        title VARCHAR,
                        description VARCHAR,
                        url VARCHAR UNIQUE,  // Assuming URL is unique for each article
                        sentiment FLOAT,
                        sentimentAnalysis INT,
                        naturalAnalysis FLOAT,
                        normalizedSentiment FLOAT,
                        sentimentLabel VARCHAR
                    )`);
                
                for (let article of articles) {
                    // DuckDB's approach to handle duplicates might vary, check the documentation
                    // This example uses a generic SQL approach
                    await con.run('INSERT INTO articles (title, description, url, sentiment, sentimentAnalysis, naturalAnalysis, normalizedSentiment, sentimentLabel) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM articles WHERE url = ?)', [
                        article.title,
                        article.description,
                        article.url,
                        article.sentiment,
                        article.sentimentAnalysis,
                        article.naturalAnalysis,
                        article.normalizedSentiment,
                        article.sentimentLabel,
                        article.url  // For the WHERE NOT EXISTS clause
                    ]);
                }
            } catch (error) {
                console.error('Error saving articles to DuckDB:', error);
            } finally {
                con.close();
            }
        }; 
        
        loadFunction = async () => {
            const con = db.connect();
            const result = await con.all('SELECT * FROM articles');
            con.close();
            return result;
        };

    } else if (DATABASE === 'json') { 
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'articles.json');

        saveFunction = async (articles) => {
            fs.writeFileSync(filePath, JSON.stringify(articles), 'utf8');
        };

        loadFunction = async () => {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        };
    } else {
        console.error('Unsupported DATABASE value:', DATABASE);
    }
} else {
    console.log('Database functionality is disabled. Set DATABASE environment variable to enable.');
}

module.exports = {
    saveArticles: (articles) => {
        if (saveFunction) {
            return saveFunction(articles);
        } else {
            throw new Error('Database functionality is disabled. Ensure DATABASE environment variable is correctly set.');
        }
    },
    loadArticles: loadFunction
};
