// generateKey.js
const crypto = require('crypto');

function generateSecretKey() {
    const secretKey = crypto.randomBytes(64).toString('hex');
    console.log('This is your secret key:', secretKey);
}

generateSecretKey();