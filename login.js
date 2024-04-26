// login.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('apiusers')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (!data) {
      return res.status(404).json({ error: "User not found" });
    }

    if (data.password === password) {
      const user = { name: username };
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      return res.json({ accessToken: accessToken });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

module.exports = router;
