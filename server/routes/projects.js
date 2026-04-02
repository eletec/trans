const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

// GET /api/projects
router.get('/', authMiddleware, (req, res) => {
  const projects = db.prepare(
    'SELECT id, name, heuristic, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(req.user.id);
  res.json({ projects });
});

// GET /api/projects/:id
router.get('/:id', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
  // Parse JSON fields
  project.truck_config = project.truck_config ? JSON.parse(project.truck_config) : null;
  project.palette_data = project.palette_data ? JSON.parse(project.palette_data) : [];
  project.result_data = project.result_data ? JSON.parse(project.result_data) : null;
  res.json({ project });
});

// POST /api/projects
router.post('/', authMiddleware, (req, res) => {
  const { name, truck_config, palette_data, heuristic } = req.body;
  if (!name) return res.status(400).json({ error: 'Champ name requis' });
  const result = db.prepare(
    'INSERT INTO projects (name, user_id, truck_config, palette_data, heuristic) VALUES (?, ?, ?, ?, ?)'
  ).run(
    name,
    req.user.id,
    truck_config ? JSON.stringify(truck_config) : null,
    palette_data ? JSON.stringify(palette_data) : '[]',
    heuristic || 'auto'
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/projects/:id
router.put('/:id', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Projet non trouvé' });

  const { name, truck_config, palette_data, result_data, heuristic } = req.body;
  db.prepare(
    `UPDATE projects SET name = COALESCE(?, name), truck_config = COALESCE(?, truck_config),
     palette_data = COALESCE(?, palette_data), result_data = COALESCE(?, result_data),
     heuristic = COALESCE(?, heuristic), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    name || null,
    truck_config ? JSON.stringify(truck_config) : null,
    palette_data ? JSON.stringify(palette_data) : null,
    result_data ? JSON.stringify(result_data) : null,
    heuristic || null,
    req.params.id
  );
  res.json({ success: true });
});

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Projet non trouvé' });
  res.json({ success: true });
});

module.exports = router;
