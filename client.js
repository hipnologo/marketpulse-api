// client.js
// Client script to fetch and display sentiment data from the backend server.
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const fetchSentimentData = async (endpoint) => {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.API_BASE_URL || 'http://localhost:3001');
    const response = await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(chalk.red('Request timed out.'));
    } else {
      console.error(chalk.red('Error fetching sentiment data:'), error.message);
    }
    return null;
  }
};

const displaySentimentData = (data) => {
  if (!data || !data.articles || data.articles.length === 0) {
    console.log(chalk.red('No data to display or no articles found.'));
    return;
  }

  console.log(chalk.blue.bold('Market Sentiment Analysis:\n'));
  data.articles.forEach(article => {
    let sentimentColor = chalk.white;
    switch (article.sentimentLabel) {
      case 'Bullish':
        sentimentColor = chalk.green;
        break;
      case 'Bearish':
        sentimentColor = chalk.red;
        break;
      case 'Neutral':
        sentimentColor = chalk.yellow;
        break;
    }

    console.log(sentimentColor(`Title: ${article.title}`));
    console.log(`Description: ${article.description || 'No description available.'}`);
    console.log(`URL: ${article.url}`);
    const normalizedSentiment = article.normalizedSentiment !== undefined ? article.normalizedSentiment.toFixed(3) : 'N/A';
    console.log(`Sentiment: ${article.sentimentLabel} (${normalizedSentiment})\n`);
  });

  // Check if aggregatedSentiment is defined and is a number
  if (data.aggregatedSentiment !== undefined && !isNaN(data.aggregatedSentiment)) {
    let marketSentimentColor = data.marketSentiment === 'Neutral' ? chalk.yellow : data.marketSentiment === 'Bullish' ? chalk.green : chalk.red;
    console.log(chalk.blue(`Aggregated Sentiment: ${data.aggregatedSentiment.toFixed(3)}`));
    console.log(marketSentimentColor(`Overall Market Sentiment: ${data.marketSentiment}\n`));
  } else {
    console.log(chalk.red('Aggregated sentiment data is not available.'));
  }
};

const promptUser = () => {
  rl.question(chalk.green('Do you want to load existing news or fetch new articles? (load/fetch) '), answer => {
    const action = answer.toLowerCase();
    if (action === 'load' || action === 'fetch') {
      run(action === 'load' ? '/api/load-news' : '/api/news-sentiment');
    } else {
      console.log(chalk.red('Invalid input. Please type "load" or "fetch".'));
      promptUser();
    }
  });
};

const run = async (endpoint) => {
  console.log(chalk.yellow(`Fetching data from ${endpoint}`));
  const sentimentData = await fetchSentimentData(endpoint);
  if (sentimentData) {
    displaySentimentData(sentimentData);
  }
  rl.close();
};

promptUser();