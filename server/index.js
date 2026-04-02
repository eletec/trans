require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB (creates tables if needed)
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/palettes', require('./routes/palettes'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/calculate', require('./routes/calculate'));

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Easy Packing server running on http://localhost:${PORT}`);
});
