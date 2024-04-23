require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Sentiment = require('sentiment');
const natural = require('natural');
const finnhub = require('finnhub');
const { saveArticles } = require('./database');
const { scrapeNews } = require('./scraper');

const app = express();
app.use(express.json());

const sentimentAnalyzer = new Sentiment();
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();
const naturalAnalyzer = new Analyzer("English", stemmer, "afinn");

const gnewsApiKey = process.env.GNEWS_API_KEY;
const finnhubApiKey = process.env.FINNHUB_API_KEY;
const finnhubClient = new finnhub.DefaultApi();
finnhub.ApiClient.instance.authentications['api_key'].apiKey = finnhubApiKey;

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
    const response = await axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&token=${gnewsApiKey}&lang=en`);
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
            saveArticles(normalizedSentimentScores).then(() => {
                console.log('Articles saved to the database.');
            }).catch(console.error);
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

module.exports = app;
