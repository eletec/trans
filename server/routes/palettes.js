const express = require('express');
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../auth');

const router = express.Router();

// GET /api/palettes — list palette templates
router.get('/', optionalAuth, (req, res) => {
  const userId = req.user ? req.user.id : null;
  const palettes = db.prepare(
    'SELECT * FROM palette_templates WHERE user_id IS NULL OR user_id = ? ORDER BY name'
  ).all(userId);
  res.json({ palettes });
});

// POST /api/palettes — create custom palette template
router.post('/', authMiddleware, (req, res) => {
  const { name, length_mm, width_mm, height_mm, weight_kg } = req.body;
  if (!name || !length_mm || !width_mm) {
    return res.status(400).json({ error: 'Champs name, length_mm, width_mm requis' });
  }
  const result = db.prepare(
    'INSERT INTO palette_templates (name, length_mm, width_mm, height_mm, weight_kg, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, length_mm, width_mm, height_mm || 1500, weight_kg || 0, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/palettes/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const palette = db.prepare('SELECT * FROM palette_templates WHERE id = ?').get(req.params.id);
  if (!palette) return res.status(404).json({ error: 'Palette non trouvée' });
  if (palette.user_id && palette.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès interdit' });
  }
  db.prepare('DELETE FROM palette_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/trucks — list truck templates
router.get('/trucks', optionalAuth, (req, res) => {
  const userId = req.user ? req.user.id : null;
  const trucks = db.prepare(
    'SELECT * FROM truck_templates WHERE user_id IS NULL OR user_id = ? ORDER BY name'
  ).all(userId);
  res.json({ trucks });
});

// POST /api/trucks
router.post('/trucks', authMiddleware, (req, res) => {
  const { name, length_cm, width_cm, height_cm, max_weight_kg } = req.body;
  if (!name || !length_cm || !width_cm) {
    return res.status(400).json({ error: 'Champs name, length_cm, width_cm requis' });
  }
  const result = db.prepare(
    'INSERT INTO truck_templates (name, length_cm, width_cm, height_cm, max_weight_kg, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, length_cm, width_cm, height_cm || 270, max_weight_kg || 24000, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
