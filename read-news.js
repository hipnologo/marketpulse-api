require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI(OPENAI_API_KEY);

// OpenAI API endpoint for reading the news; fallback to 'say' if OpenAI fails
const say = require('say');
app.post('/api/read-news', async (req, res) => {
    const { text } = req.body; // Define `text` here so it's accessible throughout the function

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
        try {
            // Using 'say' as a simple example for server-side fallback
            say.export(text, null, 1, 'fallbackSpeech.mp3', (err) => {
                if (err) {
                    console.error('Error with alternative TTS service:', err);
                    res.status(503).json({ error: 'TTS services unavailable', fallbackText: text });
                } else {
                    // Send the fallback audio file or its location as needed
                    res.sendFile(path.resolve('fallbackSpeech.mp3'));
                }
            });
        } catch (fallbackError) {
            console.error('Error with alternative TTS service:', fallbackError);
            res.status(503).json({ error: 'TTS services unavailable', fallbackText: text });
        }
    }
});

module.exports = app;
