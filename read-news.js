const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const say = require('say');
const path = require('path');
const fs = require('fs');

// Setup OpenAI client
const openai = new OpenAI.ApiClient({
    apiKey: process.env.OPENAI_API_KEY
});

router.post('/', async (req, res) => {
    const { text } = req.body;  // Ensure text is provided in the request body

    if (!text) {
        return res.status(400).json({ error: 'No text provided for TTS.' });
    }

    try {
        const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
        res.json({ audioContent: audioBuffer.toString('base64') });
    } catch (error) {
        console.error('Error with OpenAI TTS service:', error);
        // Fallback to server-side TTS using 'say'
        const fileName = `fallbackSpeech-${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);
        say.export(text, null, 1, filePath, (err) => {
            if (err) {
                console.error('Error with alternative TTS service:', err);
                return res.status(503).json({ error: 'TTS services unavailable', fallbackText: text });
            } else {
                // Send the fallback audio file or its location as needed
                res.sendFile(filePath, (err) => {
                    // Clean up the file after sending it
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Error cleaning up file:", err);
                    });
                });
            }
        });
    }
});

module.exports = router;
