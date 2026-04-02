const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken } = require('../auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Champs username, email et password requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Utilisateur ou email déjà existant' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
  const user = { id: result.lastInsertRowid, username, role: 'user' };
  const token = generateToken(user);
  res.status(201).json({ user: { id: user.id, username, email, role: 'user' }, token });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Champs username et password requis' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = generateToken(user);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    token
  });
});

// GET /api/auth/me
const { authMiddleware } = require('../auth');
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at, preferences FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  user.preferences = user.preferences ? JSON.parse(user.preferences) : null;
  res.json({ user });
});

// GET /api/auth/preferences
router.get('/preferences', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
  const preferences = row && row.preferences ? JSON.parse(row.preferences) : {};
  res.json({ preferences });
});

// PUT /api/auth/preferences
router.put('/preferences', authMiddleware, (req, res) => {
  const { preferences } = req.body;
  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({ error: 'Champ preferences requis (objet)' });
  }
  // Merge with existing preferences
  const row = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
  const existing = row && row.preferences ? JSON.parse(row.preferences) : {};
  const merged = { ...existing, ...preferences };
  db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(merged), req.user.id);
  res.json({ preferences: merged });
});

module.exports = router;
