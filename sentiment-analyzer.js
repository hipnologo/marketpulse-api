
// sentiment-analyzer.js
/**
 * Sentiment Analysis Module
 * 
 * This module provides functions to perform sentiment analysis on news articles.
 * The process includes tokenization, sentiment scoring, standardizing, normalizing,
 * and classifying overall sentiment. Here's a breakdown of each step:
 * 
 * 1. Sentiment Calculation:
 *    - Tokenization: Splits the article title into individual words (tokens).
 *    - Sentiment Scoring: Uses two methods to compute sentiment scores:
 *        a. sentimentAnalyzer: Computes a sentiment score based on the entire title.
 *        b. naturalAnalyzer: Computes sentiment based on tokens using natural language processing.
 *    - Average Score: Averages the scores from both analyzers to get a balanced sentiment measurement.
 * 
 * 2. Standardizing Scores:
 *    - Computes the mean and standard deviation of the average sentiment scores.
 *    - Standardizes each score by subtracting the mean and dividing by the standard deviation.
 *    - Useful for comparing sentiment scores across different scales or distributions.
 * 
 * 3. Normalizing Scores:
 *    - Adjusts scores to a range between -1 and 1 based on the most extreme values found.
 *    - Makes data uniform and is useful when aggregating or comparing sentiments across different sources.
 * 
 * 4. Overall Sentiment Classification:
 *    - Calculates the average of the normalized sentiments.
 *    - Classifies the overall sentiment as 'Bullish', 'Neutral', or 'Bearish' based on predefined thresholds.
 * 
 * These steps provide a robust framework for analyzing and interpreting the sentiment of news articles,
 * making it easier to identify general market sentiment trends and outliers.
 * 
 * Important: Each function in this module ensures it handles cases where data might be incomplete or missing,
 * and errors in fetching or processing do not halt the entire pipeline but are handled appropriately.
 */

const Sentiment = require('sentiment');
const natural = require('natural');
const sentimentAnalyzer = new Sentiment();
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();
const naturalAnalyzer = new Analyzer("English", stemmer, "afinn");

function analyzeSentiment(article) {
    // Check if there's either a title or a description to analyze
    const textToAnalyze = article.title || article.description;
    
    if (!article || !textToAnalyze) {
        console.error('Missing text for sentiment analysis:', article);
        return null;  // Skip this article if both title and description are missing
    }

    const tokens = tokenizer.tokenize(textToAnalyze);
    const sentimentScore = sentimentAnalyzer.analyze(textToAnalyze).score || 0;
    const naturalScore = naturalAnalyzer.getSentiment(tokens) || 0;
    const averageScore = (sentimentScore + naturalScore) / 2;

    return {
        ...article,
        url: article.url || 'URL not available',
        sentimentScore,
        naturalScore,
        averageScore: isNaN(averageScore) ? 0 : averageScore
    };
}

function standardizeScores(articles) {
    const scores = articles.map(a => a.averageScore).filter(score => score !== undefined);
    const mean = scores.reduce((acc, val) => acc + val, 0) / scores.length;
    const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return articles.map(article => ({
        ...article,
        standardizedSentiment: (article.averageScore - mean) / stdDev,
    }));
}

function normalizeScores(articles) {
    const scores = articles.map(a => a.averageScore).filter(score => !isNaN(score));
    const maxPositive = Math.max(...scores.filter(score => score > 0), 1);
    const maxNegative = Math.min(...scores.filter(score => score < 0), -1);

    return articles.map(article => ({
        ...article,
        normalizedSentiment: article.averageScore > 0 ?
            article.averageScore / maxPositive :
            article.averageScore / Math.abs(maxNegative),
    }));
}

function classifyOverallSentiment(articles) {
    const normalizedSentiments = articles.map(a => a.normalizedSentiment).filter(n => !isNaN(n));
    if (normalizedSentiments.length === 0) return { aggregatedSentiment: null, label: 'No data' };

    const averageSentiment = normalizedSentiments.reduce((acc, val) => acc + val, 0) / normalizedSentiments.length;
    return {
        aggregatedSentiment: averageSentiment,
        label: averageSentiment > 0.2 ? 'Bullish' : averageSentiment < -0.2 ? 'Bearish' : 'Neutral'
    };
}

module.exports = {
    analyzeSentiment,
    standardizeScores,
    normalizeScores,
    classifyOverallSentiment
};
