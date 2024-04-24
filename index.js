// server.js
// server-side of the MarketPulse app
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Sentiment = require('sentiment');
const natural = require('natural');
const finnhub = require('finnhub');
const chalk = require('chalk');
const os = require('os');

const app = express();
const port = process.env.PORT || 3001;

// Sentiment analysis setup
const sentimentAnalyzer = new Sentiment();
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();
const naturalAnalyzer = new Analyzer("English", stemmer, "afinn");

// database setup
const { saveArticles, loadArticles } = require('./database');
const { scrapeNews } = require('./scraper');
const { verify } = require('crypto');
const fs = require('fs');
const e = require('express');
const path = require('path');
const say = require('say');

// OpenAI API setup
//const OpenAI = require('openai');
//const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
//const openai = new OpenAI(OPENAI_API_KEY);

// Middleware to parse JSON data
app.use(express.json());

// Enable CORS for client-side
app.use(cors());

// Set up the GNews and Finnhub API keys
const gnewsApiKey = process.env.GNEWS_API_KEY;
const finnhubApiKey = process.env.FINNHUB_API_KEY; // Ensure this is set in the .env file

// Set the base URL depending on the environment
const baseUrl = process.env.API_BASE_URL;
//const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.API_BASE_URL || 'http://localhost:3001');

// Log the base URL to see what it's set to on startup (helpful for debugging)
console.log(`Base URL is set to: ${baseUrl}`);

// Use the DATABASE env variable to check if database functionality should be enabled
const useDatabase = process.env.DATABASE && process.env.DATABASE.trim() !== '';

// Initialize the Finnhub client
const finnhubClient = new finnhub.DefaultApi();
finnhub.ApiClient.instance.authentications['api_key'].apiKey = finnhubApiKey;

// Normalization and sentiment classification functions
const normalizeScore = (score, maxPositive, maxNegative) => {
    return score > 0 ? score / maxPositive :
           score < 0 ? score / Math.abs(maxNegative) : 0;
};

const classifySentiment = (sentiment) => {
    return sentiment > 0.2 ? 'Bullish' :
           sentiment < -0.2 ? 'Bearish' : 'Neutral';
};

// Function to fetch news from Finnhub
const fetchFinnhubNews = async () => {
    return new Promise((resolve, reject) => {
        finnhubClient.marketNews("general", {}, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data.map(item => ({
                    title: item.headline,
                    source: item.source,
                    summary: item.summary,
                    url: item.url
                })));
            }
        });
    });
};

// Function to fetch news from GNews
const fetchGNews = async (query) => {
    const response = await axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=10&token=${gnewsApiKey}`, verify = false);
    return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url
    }));
};

// Function to get scrapped news and transform into the expected format
const scrapedNews = async () => {
    try {
        const newsHeadlines = await scrapeNews();
        // Transform the scrapped headlines to match the expected format
        return newsHeadlines.map(headline => ({
            title: headline.title || 'Title not available.', // Use a placeholder if no title is provided
            description: headline.description || 'Description not available.', // Use a placeholder if no description is provided
            url: headline.link || 'https://finance.yahoo.com/news/' // Provide a base URL since specific URLs might not be available
        }));
    } catch (error) {
        console.error('Error fetching scrapped news:', error);
        return [];
    }
};

// API endpoint for Health Check with expanded statistics
app.get('/', (req, res) => {
    const uptime = process.uptime(); // Process uptime in seconds
    const memoryUsage = process.memoryUsage(); // Memory usage details
    const cpuLoad = os.loadavg(); // Average CPU load over 1, 5, and 15 minutes

    const healthStats = {
        status: 'Market Pulse is running',
        uptime: `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`,
        memoryUsage: {
            rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`, // Resident set size
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`, // Total Heap Size
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`, // Heap used
            external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB` // External memory used by V8
        },
        cpuLoad: {
            '1min': cpuLoad[0],
            '5min': cpuLoad[1],
            '15min': cpuLoad[2]
        }
    };

    res.json(healthStats);
});

// API endpoint for news sentiment analysis
app.get('/api/news-sentiment', async (req, res) => {
    const query = req.query.q || 'stock market';

    try {
        // Use Promise.allSettled instead of Promise.all
        const results = await Promise.allSettled([
            fetchGNews(query).catch(error => {
                console.error(chalk.red(`Error fetching data from GNews: ${error}`));
                return []; // Return an empty array in case of error
            }),
            fetchFinnhubNews().catch(error => {
                console.error(chalk.red(`Error fetching data from Finnhub: ${error}`));
                return []; // Return an empty array in case of error
            }),
            scrapedNews().catch(error => {
                console.error(chalk.red(`Error fetching data from open source news API: ${error}`));
                return [];
            })
        ]);

        // Filter out the successful promises and combine the articles
        const combinedArticles = results.reduce((acc, result) => {
            if (result.status === 'fulfilled') {
                return acc.concat(result.value);
            }
            return acc;
        }, []);

        // Proceed with combinedArticles as before
        const sentimentScores = combinedArticles.map(article => {
            if (!article.title) {
                console.error('Undefined title for article:', article);
                return null; // Skip this article
            }
            const tokens = tokenizer.tokenize(article.title);
            const sentimentScore = sentimentAnalyzer.analyze(article.title).score;
            const naturalScore = naturalAnalyzer.getSentiment(tokens);
            const averageScore = (sentimentScore + naturalScore) / 2;

            return {
                ...article,
                sentiment: averageScore,
                sentimentAnalysis: sentimentScore,
                naturalAnalysis: naturalScore
            };
        }).filter(article => article !== null); // Remove skipped articles

        const maxPositive = Math.max(...sentimentScores.map(s => s.sentiment).filter(s => s > 0), 1);
        const maxNegative = Math.min(...sentimentScores.map(s => s.sentiment).filter(s => s < 0), -1);

        const normalizedSentimentScores = sentimentScores.map(article => ({
            ...article,
            normalizedSentiment: normalizeScore(article.sentiment, maxPositive, maxNegative),
        })).map(article => ({
            ...article,
            sentimentLabel: classifySentiment(article.normalizedSentiment)
        }));

        const normalizedAverageSentiment = normalizedSentimentScores.reduce((acc, val) => acc + val.normalizedSentiment, 0) / normalizedSentimentScores.length;
        const marketSentiment = classifySentiment(normalizedAverageSentiment);

        // Save the processed data 
        if (useDatabase) {
            saveArticles(normalizedSentimentScores)
                .then(() => {
                    console.log('Articles saved to the database.');
                })
                .catch(error => {
                    console.error('Failed to save articles:', error);
                });
        } else {
            console.log('Database functionality is disabled.');
        }

        // Send response back to client
        res.json({
            articles: normalizedSentimentScores,
            aggregatedSentiment: normalizedAverageSentiment,
            marketSentiment
        });
    } catch (error) {
        console.error('Error fetching news sentiment:', error);
        res.status(500).json({ error: error.message || 'Error fetching news sentiment' });
    }
});

// API endpoint to load existing news
app.get('/api/load-news', async (req, res) => {
    try {
        const articles = await loadArticles();
        console.log('Articles fetched:', articles);  // Log the fetched articles to see what is being returned
        if (!articles || articles.length === 0) {
            console.log('No articles found in database.');
            res.status(404).json({ message: 'No articles found' });
        } else {
            res.json({ articles });
        }
    } catch (error) {
        console.error('Failed to load articles:', error);
        res.status(500).json({ error: error.message || 'Failed to load articles from the database' });
    }
});

// OpenAI API endpoint for reading the news
//app.post('/api/read-news', async (req, res) => {
//    const { text } = req.body; // Define `text` here so it's accessible throughout the function
//
//    try {
//        const speechResponse = await openai.audio.speech.create({
//            model: "tts-1",
//            voice: "alloy",
//            input: text,
//        });
//        const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
//        res.json({ audioContent: audioBuffer.toString('base64') });
//    } catch (error) {
//        console.error('Error with OpenAI TTS service:', error);
//        try {
//            // Using 'say' as a simple example for server-side fallback
//            say.export(text, null, 1, 'fallbackSpeech.mp3', (err) => {
//                if (err) {
//                    console.error('Error with alternative TTS service:', err);
//                    res.status(503).json({ error: 'TTS services unavailable', fallbackText: text });
//                } else {
//                    // Send the fallback audio file or its location as needed
//                    res.sendFile(path.resolve('fallbackSpeech.mp3'));
//                }
//            });
//        } catch (fallbackError) {
//            console.error('Error with alternative TTS service:', fallbackError);
//            res.status(503).json({ error: 'TTS services unavailable', fallbackText: text });
//        }
//    }
//});

// Start the server
if (!process.env.VERCEL) {
    app.listen(port, (err) => {
        if (err) {
        console.error(chalk.red('Error starting server:', err));
        } else {
        console.log(chalk.greenBright(`Server is running on http://${baseUrl}:${port}`));
        }
    });
}

module.exports = app;
