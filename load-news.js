const express = require('express');
const router = express.Router();
const { loadArticles } = require('./database');

router.get('/', async (req, res) => {
    try {
        const articles = await loadArticles();
        if (!articles || articles.length === 0) {
            res.status(404).json({ message: 'No articles found' });
        } else {
            res.json({ articles });
        }
    } catch (error) {
        console.error('Failed to load articles:', error);
        res.status(500).json({ error: error.message || 'Failed to load articles from the database' });
    }
});

module.exports = router;
