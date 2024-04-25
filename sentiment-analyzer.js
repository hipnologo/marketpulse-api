const Sentiment = require('sentiment');
const natural = require('natural');
const sentimentAnalyzer = new Sentiment();
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();
const naturalAnalyzer = new Analyzer("English", stemmer, "afinn");

function analyzeSentiment(article) {
    const tokens = tokenizer.tokenize(article.title);
    const sentimentScore = sentimentAnalyzer.analyze(article.title).score;
    const naturalScore = naturalAnalyzer.getSentiment(tokens);
    return {
        ...article,
        sentimentScore,
        naturalScore,
        averageScore: (sentimentScore + naturalScore) / 2
    };
}

function normalizeScores(articles) {
    const scores = articles.map(a => a.averageScore);
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
    const averageSentiment = articles.reduce((acc, val) => acc + val.normalizedSentiment, 0) / articles.length;
    return {
        aggregatedSentiment: averageSentiment,
        label: averageSentiment > 0.2 ? 'Bullish' : averageSentiment < -0.2 ? 'Bearish' : 'Neutral'
    };
}

module.exports = {
    analyzeSentiment,
    normalizeScores,
    classifyOverallSentiment
};
