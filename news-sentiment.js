// news-sentiment.js
const express = require('express');
const router = express.Router();
const { fetchGNews, fetchFinnhubNews, scrapeNews } = require('./news-fetchers');
const { analyzeSentiment, standardizeScores, classifyOverallSentiment } = require('./sentiment-analyzer');

router.get('/', async (req, res) => {
    const query = req.query.q || 'stock market';

    try {
        const results = await Promise.allSettled([
            fetchGNews(query),
            fetchFinnhubNews(),
            scrapeNews()
        ]);

        const combinedArticles = results.reduce((acc, result) => {
            if (result.status === 'fulfilled') {
                return acc.concat(result.value);
            }
            return acc;
        }, []);

        if (!combinedArticles.length) {
            return res.status(404).json({ message: "No news articles found." });
        }

        const sentimentResults = combinedArticles.map(article => analyzeSentiment(article)).filter(article => article !== null);
        if (!sentimentResults.length) {
            return res.status(404).json({ message: "No valid articles for sentiment analysis." });
        }
        
        const standardizedSentimentScores = standardizeScores(sentimentResults);
        const marketSentiment = classifyOverallSentiment(standardizedSentimentScores);

        res.json({
            articles: standardizedSentimentScores,
            aggregatedSentiment: marketSentiment.aggregatedSentiment,
            marketSentiment: marketSentiment.label
        });
    } catch (error) {
        console.error('Error fetching news sentiment:', error);
        res.status(500).json({ error: error.message || 'Error processing news sentiment' });
    }
});

module.exports = router;