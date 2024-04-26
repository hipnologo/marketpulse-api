// auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Bearer Token

  if (token == null) return res.sendStatus(401); // if no token, return 401

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // if token is not valid, return 403
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
