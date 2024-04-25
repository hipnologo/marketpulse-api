const express = require('express');
const router = express.Router();
const { fetchGNews, fetchFinnhubNews, scrapeNews } = require('./news-fetchers');  // Assumed new module for fetching news
const { analyzeSentiment, normalizeScores, classifyOverallSentiment } = require('./sentiment-analyzer');  // Assumed new module for sentiment analysis

// Endpoint for news sentiment analysis
router.get('/', async (req, res) => {
    const query = req.query.q || 'stock market';

    try {
        // Fetch news from different sources
        const results = await Promise.allSettled([
            fetchGNews(query),
            fetchFinnhubNews(),
            scrapeNews()
        ]);

        // Combine articles from all sources
        const combinedArticles = results.reduce((acc, result) => {
            if (result.status === 'fulfilled') {
                return acc.concat(result.value);
            }
            return acc;
        }, []);

        if (!combinedArticles.length) {
            return res.status(404).json({ message: "No news articles found." });
        }

        // Analyze sentiment of combined articles
        const sentimentResults = combinedArticles.map(article => analyzeSentiment(article));
        const filteredResults = sentimentResults.filter(result => result != null);

        // Normalize and classify sentiment scores
        const normalizedSentimentScores = normalizeScores(filteredResults);
        const marketSentiment = classifyOverallSentiment(normalizedSentimentScores);

        // Prepare and send the response
        res.json({
            articles: normalizedSentimentScores,
            aggregatedSentiment: marketSentiment.aggregatedSentiment,
            marketSentiment: marketSentiment.label
        });
    } catch (error) {
        console.error('Error fetching news sentiment:', error);
        res.status(500).json({ error: error.message || 'Error processing news sentiment' });
    }
});

module.exports = router;
