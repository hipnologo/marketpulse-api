require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for client-side
app.use(cors());

const finnhubApiKey = process.env.FINNHUB_API_KEY;

// Route to get sentiment
app.get('/api/sentiment', async (req, res) => {
  const symbol = req.query.symbol || 'AAPL'; // Default to Apple Inc. as an example
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/news-sentiment?symbol=${symbol}&token=${finnhubApiKey}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ error: 'Error fetching sentiment data' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
