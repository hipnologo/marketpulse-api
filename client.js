// client.js
// Client script to fetch and display sentiment data from the backend server.
const axios = require('axios');
const chalk = require('chalk');
const readlineSync = require('readline-sync');

const port = process.env.PORT || 3001;
const useHttps = process.env.USE_HTTPS === 'true';
const protocol = useHttps ? 'https' : 'http';
const apiBaseUrl = process.env.API_BASE_URL;
let globalToken = null;

console.log(chalk.yellowBright(`Environment Base URL: ${apiBaseUrl}`)); 

const login = async (username, password) => {
    const baseUrl = apiBaseUrl
    ? `${protocol}://${apiBaseUrl}:${port}`
    : `${protocol}://localhost:${port}`;
    console.log(chalk.white(`Logging in to ${baseUrl}`));
    try {
        const response = await axios.post(`${baseUrl}/api/login`, { username, password });
        return response.data.accessToken;
    } catch (error) {
        console.error(chalk.red('Error logging in:'), error.message);
        return null;
    }
};

const fetchSentimentData = async (endpoint, token) => {
    const baseUrl = apiBaseUrl
    ? `${protocol}://${apiBaseUrl}:${port}`
    : `${protocol}://localhost:${port}`;
    console.log(chalk.white(`Fetching data from ${baseUrl}${endpoint}`));
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
        const response = await axios.get(`${baseUrl}${endpoint}`, { headers, timeout: 5000 });
        return response.data;
    } catch (error) {
        console.error(chalk.red('Error fetching sentiment data:'), error.message);
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
      const sentimentLabel = article.sentimentLabel || 'No sentiment analysis available';
      const normalizedSentiment = article.normalizedSentiment !== undefined ? article.normalizedSentiment.toFixed(3) : 'N/A';
      console.log(chalk.blue(`Title: ${article.title}`));
      console.log(`Description: ${article.description || 'No description available.'}`);
      console.log(`URL: ${article.url}`);
      console.log(`Sentiment: ${sentimentLabel} (${normalizedSentiment})\n`);
    });
  
    if (data.aggregatedSentiment !== undefined && data.aggregatedSentiment !== null && !isNaN(data.aggregatedSentiment)) {
      const sentiment = data.aggregatedSentiment.toFixed(3);
      let marketSentimentColor = chalk.white;
      if (data.marketSentiment === 'Bullish') {
        marketSentimentColor = chalk.green;
      } else if (data.marketSentiment === 'Bearish') {
        marketSentimentColor = chalk.red;
      } else if (data.marketSentiment === 'Neutral') {
        marketSentimentColor = chalk.yellow;
      }
      console.log(chalk.blue(`Aggregated Sentiment: ${sentiment}`));
      console.log(marketSentimentColor(`Overall Market Sentiment: ${data.marketSentiment}`));
    } else {
      console.log(chalk.red('Aggregated sentiment data is not available or invalid.'));
    }
  };  

const promptUser = async () => {
  console.log(chalk.green('Choose an action - login, load, or fetch:'));
  const action = readlineSync.question('Enter action (login, load, fetch): ').trim().toLowerCase();
  switch (action) {
      case 'login':
          const username = readlineSync.question('Enter username: ');
          const password = readlineSync.question('Enter password: ', { hideEchoBack: true });
          globalToken = await login(username, password);
          console.log(chalk.blue(`Received token: ${globalToken || 'No token received'}`));
          break;
      case 'load':
      case 'fetch':
          if (!globalToken) {
              console.log(chalk.red('You must be logged in to perform this action.'));
          } else {
              const endpoint = action === 'load' ? '/api/load-news' : '/api/news-sentiment';
              const data = await fetchSentimentData(endpoint, globalToken);
              displaySentimentData(data);
          }
          break;
      default:
          console.log(chalk.red('Invalid input. Please type "login", "load", or "fetch".'));
          break;
  }
  promptUser(); // Recursive call to allow further actions
};

promptUser();