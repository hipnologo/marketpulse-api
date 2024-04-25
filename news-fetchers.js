const axios = require('axios');
const { scrapeNews } = require('./scraper');  // Assumes you have a scraper.js for scraping news

// Fetch news from GNews
async function fetchGNews(query) {
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=10&token=${process.env.GNEWS_API_KEY}`;
        const response = await axios.get(url);
        return response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            url: article.url
        }));
    } catch (error) {
        console.error('Error fetching data from GNews:', error);
        return [];
    }
}

// Fetch news from Finnhub
async function fetchFinnhubNews() {
    const finnhub = require('finnhub');
    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = process.env.FINNHUB_API_KEY;
    const finnhubClient = new finnhub.DefaultApi();

    return new Promise((resolve, reject) => {
        finnhubClient.marketNews("general", {}, (error, data) => {
            if (error) {
                console.error('Error fetching data from Finnhub:', error);
                reject([]);
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
}

module.exports = {
    fetchGNews,
    fetchFinnhubNews,
    scrapeNews  // Exported directly from scraper.js
};
