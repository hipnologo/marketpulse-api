// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON data and handle CORS
app.use(express.json());
app.use(cors());

// Route handlers
const healthRouter = require('./health');
const newsSentimentRouter = require('./news-sentiment');
const loadNewsRouter = require('./load-news');

// Define the route endpoints
app.use('/', healthRouter);  // Health check route
app.use('/api/news-sentiment', newsSentimentRouter);  // News sentiment analysis route
app.use('/api/load-news', loadNewsRouter);  // Load saved news route

// Start the server, only if not running under Vercel
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;
