// scraper.js

// Import necessary modules
const axios = require('axios');
const cheerio = require('cheerio');

// Define the URL for Yahoo Finance news
const url = 'https://finance.yahoo.com/topic/latest-news/';

// Function to scrape news headlines from Yahoo Finance
const scrapeNews = async () => {
    try {
        // Send a GET request to the website
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
        }, verify = false);
        const htmlContent = response.data;

        // Parse the HTML content using Cheerio
        const $ = cheerio.load(htmlContent);

        // Find all news headline elements and extract their texts
        const newsHeadlines = [];  
        $('h3.Mb\\(5px\\)').each((_, element) => {  // use .slice(0, 10) to limit the number of news headlines
            const $element = $(element);
            const $link = $element.find('a');
            const title = $link.text().trim();
            const link = 'https://finance.yahoo.com' + $link.attr('href');
            const description = $element.next('p').text().trim();

            newsHeadlines.push({
                title,
                link,
                description
            });
        });

        return newsHeadlines;    
    } catch (error) {
        console.error('Error scraping Yahoo Finance news:', error.message); 
    }
};

// Export the scrapeNews function to be used in other parts of the application
module.exports = { scrapeNews };