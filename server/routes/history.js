const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

// GET /api/history — list calculation history (user's + entity's)
router.get('/', authMiddleware, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const user = db.prepare('SELECT entity_id FROM users WHERE id = ?').get(req.user.id);

  let rows;
  if (user && user.entity_id) {
    // Show all history for the entity
    rows = db.prepare(`
      SELECT h.*, u.username FROM calculation_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.entity_id = ?
      ORDER BY h.created_at DESC LIMIT ? OFFSET ?
    `).all(user.entity_id, limit, offset);
  } else {
    // Show only user's own history
    rows = db.prepare(`
      SELECT h.*, u.username FROM calculation_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);
  }

  // Parse JSON fields
  const history = rows.map(r => ({
    ...r,
    truck_config: r.truck_config ? JSON.parse(r.truck_config) : null,
    palette_data: r.palette_data ? JSON.parse(r.palette_data) : null,
    result_data: r.result_data ? JSON.parse(r.result_data) : null,
    settings: r.settings ? JSON.parse(r.settings) : null,
  }));

  res.json({ history });
});

// POST /api/history — save a calculation to history
router.post('/', authMiddleware, (req, res) => {
  const { projectName, truckConfig, paletteData, resultData, settings, heuristic } = req.body;

  const user = db.prepare('SELECT entity_id FROM users WHERE id = ?').get(req.user.id);

  const result = resultData || {};
  const firstTruck = result.trucks && result.trucks[0];

  const stmt = db.prepare(`
    INSERT INTO calculation_history (user_id, entity_id, project_name, truck_config, palette_data, result_data, settings, heuristic, floor_meters, total_palettes, total_placed, num_trucks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const r = stmt.run(
    req.user.id,
    user ? user.entity_id : null,
    projectName || null,
    JSON.stringify(truckConfig),
    JSON.stringify(paletteData),
    JSON.stringify(resultData),
    JSON.stringify(settings),
    heuristic || null,
    firstTruck ? firstTruck.floorMeters : null,
    result.totalPalettes || null,
    result.totalPlaced || null,
    result.trucks ? result.trucks.length : null
  );

  res.status(201).json({ id: r.lastInsertRowid });
});

// GET /api/history/:id — get single history entry
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM calculation_history WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Entrée non trouvée' });

  // Check access
  if (row.user_id !== req.user.id) {
    const user = db.prepare('SELECT entity_id FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.entity_id !== row.entity_id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
  }

  row.truck_config = row.truck_config ? JSON.parse(row.truck_config) : null;
  row.palette_data = row.palette_data ? JSON.parse(row.palette_data) : null;
  row.result_data = row.result_data ? JSON.parse(row.result_data) : null;
  row.settings = row.settings ? JSON.parse(row.settings) : null;

  res.json({ entry: row });
});

// DELETE /api/history/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT user_id FROM calculation_history WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Entrée non trouvée' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  db.prepare('DELETE FROM calculation_history WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
