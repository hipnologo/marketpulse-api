# MarketPulse: News Sentiment Analysis and Text-to-Speech API
This Node.js application, MarketPulse,  analyzes news sentiment and provides a Text-to-Speech (TTS) service.

## Features:

Fetches news articles from Finnhub, GNews, and a customizable scraper.
Analyzes news sentiment using sentiment libraries and classifies it as Bullish, Neutral, or Bearish.
Provides an API endpoint to retrieve the latest analyzed news articles and overall market sentiment.
Offers a Text-to-Speech (TTS) endpoint that converts news text to audio using OpenAI's service.
Includes a fallback mechanism for TTS using the say library or a placeholder text response.

## Requirements:

Node.js and npm (or yarn) package manager installed.

## Installation:

Clone this repository.

### Install dependencies:
```Bash
npm install
```
`(or yarn install)`

## Configuration:

Create a .env file in the project root directory.
Add the following environment variables to your .env file:
`GNEWS_API_KEY`: Your GNews API key (optional)
`FINNHUB_API_KEY`: Your Finnhub API key
`OPENAI_API_KEY`: Your OpenAI API key (optional)
`DATABASE`: Set to any value to enable database functionality (specific database library setup required)
`API_BASE_URL`: Set your desired base URL for the API if deployed outside Vercel

## Running the Application:

Start the server:
``` Bash
node server.js
```

## Deployment:

This application can be deployed to various platforms that support Node.js. Refer to the specific platform's documentation for deployment instructions. Vercel deployment is simplified by using the VERCEL_URL environment variable.

## API Endpoints:

* `/`: Health check endpoint (responds with "Market Pulse is running")
* `/api/health`: Extended health check endpoint with uptime, memory usage, and CPU load details.
* `/api/news-sentiment`: Retrieves analyzed news articles and overall market sentiment. You can optionally provide a query parameter q to specify a search term.
* `/api/load-news`: Fetches existing news articles from the database (requires DATABASE environment variable to be set).
* `/api/read-news`: Takes news text in the request body and returns audio content or a fallback response using TTS.

#### Example Usage:

```Bash
curl http://localhost:3001/api/news-sentiment
```
This will return a JSON response containing the analyzed news articles and overall market sentiment.

### Additional Notes:

Error handling is implemented for various operations, returning appropriate HTTP status codes.
Colored console logging (chalk) is used for informative output.
Consider implementing unit and integration tests for robust functionality.

<a href="https://www.buymeacoffee.com/hipnologod" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
