const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

// GET /api/export/project/:id — export a single project as JSON
router.get('/project/:id', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Projet non trouvé' });

  const exported = {
    version: 1,
    type: 'project',
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      truck_config: project.truck_config ? JSON.parse(project.truck_config) : null,
      palette_data: project.palette_data ? JSON.parse(project.palette_data) : null,
      result_data: project.result_data ? JSON.parse(project.result_data) : null,
      settings: project.settings ? JSON.parse(project.settings) : null,
      heuristic: project.heuristic,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }
  };

  res.setHeader('Content-Disposition', `attachment; filename="easypacking-${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(exported);
});

// GET /api/export/projects — export all projects
router.get('/projects', authMiddleware, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);

  const exported = {
    version: 1,
    type: 'projects',
    exportedAt: new Date().toISOString(),
    projects: projects.map(p => ({
      name: p.name,
      truck_config: p.truck_config ? JSON.parse(p.truck_config) : null,
      palette_data: p.palette_data ? JSON.parse(p.palette_data) : null,
      result_data: p.result_data ? JSON.parse(p.result_data) : null,
      settings: p.settings ? JSON.parse(p.settings) : null,
      heuristic: p.heuristic,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))
  };

  res.setHeader('Content-Disposition', 'attachment; filename="easypacking-all-projects.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(exported);
});

// GET /api/export/config — export palette config + user preferences
router.get('/config', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
  const prefs = user && user.preferences ? JSON.parse(user.preferences) : {};

  const exported = {
    version: 1,
    type: 'config',
    exportedAt: new Date().toISOString(),
    preferences: prefs,
  };

  res.setHeader('Content-Disposition', 'attachment; filename="easypacking-config.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(exported);
});

// POST /api/export/import — import a JSON export (project or config)
router.post('/import', authMiddleware, (req, res) => {
  const data = req.body;
  if (!data || !data.type) return res.status(400).json({ error: 'Format d\'import invalide' });

  try {
    if (data.type === 'project') {
      const p = data.project;
      if (!p || !p.name) return res.status(400).json({ error: 'Projet invalide' });
      const r = db.prepare('INSERT INTO projects (name, user_id, truck_config, palette_data, result_data, settings, heuristic) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        p.name, req.user.id,
        JSON.stringify(p.truck_config), JSON.stringify(p.palette_data),
        JSON.stringify(p.result_data), JSON.stringify(p.settings),
        p.heuristic
      );
      return res.json({ message: `Projet "${p.name}" importé`, id: r.lastInsertRowid });
    }

    if (data.type === 'projects') {
      let count = 0;
      const insert = db.prepare('INSERT INTO projects (name, user_id, truck_config, palette_data, result_data, settings, heuristic) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const importAll = db.transaction((projects) => {
        for (const p of projects) {
          insert.run(p.name, req.user.id,
            JSON.stringify(p.truck_config), JSON.stringify(p.palette_data),
            JSON.stringify(p.result_data), JSON.stringify(p.settings),
            p.heuristic);
          count++;
        }
      });
      importAll(data.projects || []);
      return res.json({ message: `${count} projet(s) importé(s)` });
    }

    if (data.type === 'config') {
      if (data.preferences) {
        const row = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
        const existing = row && row.preferences ? JSON.parse(row.preferences) : {};
        const merged = { ...existing, ...data.preferences };
        db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(merged), req.user.id);
      }
      return res.json({ message: 'Configuration importée' });
    }

    return res.status(400).json({ error: `Type "${data.type}" non supporté` });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur import: ' + e.message });
  }
});

module.exports = router;
