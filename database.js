// database.js

require('dotenv').config();  // Consider specifying path if your environment needs it.
const DATABASE = process.env.DATABASE;

const chalk = require('chalk');

let db;
let saveFunction;
let loadFunction;

(async () => {
    if (DATABASE) {
        switch (DATABASE) {
            case 'sqlite':
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
                                url TEXT UNIQUE,
                                sentiment REAL,
                                sentimentAnalysis INTEGER,
                                naturalAnalysis REAL,
                                normalizedSentiment REAL,
                                sentimentLabel TEXT
                            )`);
                    }
                });

                saveFunction = async (articles) => {
                    const stmt = db.prepare('INSERT OR REPLACE INTO articles (title, description, url, sentiment, sentimentAnalysis, naturalAnalysis, normalizedSentiment, sentimentLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                    for (let article of articles) {
                        stmt.run([
                            article.title,
                            article.description,
                            article.url,
                            article.sentiment,
                            article.sentimentAnalysis,
                            article.naturalAnalysis,
                            article.normalizedSentiment,
                            article.sentimentLabel
                        ]);
                    }
                    stmt.finalize();
                };

                loadFunction = async () => {
                    return new Promise((resolve, reject) => {
                        db.all("SELECT * FROM articles", (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        });
                    });
                };
                break;

            case 'supabase':
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
                console.log(chalk.yellow('Connected to the Supabase database.'));

                saveFunction = async (articles) => {
                    for (let article of articles) {
                        const { error } = await supabase
                            .from('articles')
                            .upsert(article, {
                                onConflict: "url"
                            });

                        if (error) throw new Error('Supabase save error: ' + error.message);
                    }
                };

                loadFunction = async () => {
                    const { data, error } = await supabase.from('articles').select('*');
                    if (error) throw new Error('Supabase load error: ' + error.message);
                    return data;
                };
                break;

            case 'mongodb':
                const { MongoClient } = require('mongodb');
                const client = new MongoClient(process.env.MONGODB_URI);
                try {
                    await client.connect();
                    console.log('Connected to the MongoDB database.');
                    db = client.db("marketpulse");

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
                        return await collection.find({}).toArray();
                    };
                } catch (error) {
                    console.error('MongoDB connection error:', error);
                }
                break;

            default:
                console.error('Unsupported DATABASE type:', DATABASE);
                break;
        }
    } else {
        console.log('Database functionality is disabled. Set DATABASE environment variable to enable.');
    }
})();

module.exports = {
    saveArticles: async (articles) => {
        if (saveFunction) {
            return await saveFunction(articles);
        } else {
            throw new Error('Database functionality is disabled or not properly configured.');
        }
    },
    loadArticles: () => {
        if (loadFunction) {
            return loadFunction();
        } else {
            throw new Error('Database functionality is disabled or not properly configured.');
        }
    }
};
