// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chalk = require('chalk');

const app = express();
const API_BASE_URL = process.env.API_BASE_URL || 'localhost';
const port = process.env.PORT || 3001;
const useHttps = process.env.USE_HTTPS === 'true';
const protocol = useHttps ? 'https' : 'http';

// Middleware to parse JSON data and handle CORS
app.use(express.json());
app.use(cors());

// Route handlers
const loginRouter = require('./login');
const authenticateToken = require('./auth');
const healthRouter = require('./health');
const newsSentimentRouter = require('./news-sentiment');
const loadNewsRouter = require('./load-news');
//const readNewsRouter = require('./read-news');

// Define the route endpoints
app.use('/', healthRouter);  // Health check route
app.use('/api/login', loginRouter);
app.use('/api/news-sentiment', authenticateToken, newsSentimentRouter);
app.use('/api/load-news', loadNewsRouter); 
//app.use('/api/read-news', authenticateToken, readNewsRouter);

// Start the server, only if not running under Vercel
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(chalk.greenBright(`Server is running on ${protocol}://${API_BASE_URL}:${port}`));
    });
}

module.exports = app;
