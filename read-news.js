// read-news.js
const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

router.post('/', async (req, res) => {
    const { text } = req.body;  // Ensure text is provided in the request body

    if (!text) {
        return res.status(400).json({ error: 'No text provided for TTS.' });
    }

    try {
        const speechResponse = await openai.createAudio({
            model: "text-to-speech", // Make sure to use the correct model identifier
            input: text,
            voice: "alloy",
        });
        const audioBuffer = Buffer.from(await speechResponse.data);
        res.json({ audioContent: audioBuffer.toString('base64') });
    } catch (error) {
        console.error('Error with OpenAI TTS service:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
