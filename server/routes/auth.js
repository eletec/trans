const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken } = require('../auth');

const router = express.Router();

// Default app settings applied when creating a new entity
const DEFAULT_ENTITY_SETTINGS = {
  paletteTemplates: [
    { name: '2500x1000', length: 2500, width: 1000, color: '#C0C0C0', label: 'PA2' },
    { name: '2100x1000', length: 2100, width: 1000, color: '#00FF00', label: 'Mobilier C' },
    { name: '1500x1000', length: 1500, width: 1000, color: '#0000FF', label: 'Mobilier B' },
    { name: '1400x1100', length: 1400, width: 1100, color: '#FF0000', label: 'Mobilier A' },
    { name: '1500x900',  length: 1500, width: 900,  color: '#FF00FF', label: 'Présentoirs' },
    { name: '1200x800',  length: 1200, width: 800,  color: '#FFFF00', label: 'PA 1' },
    { name: '1000x1200', length: 1000, width: 1200, color: '#FFA500', label: '' },
    { name: '600x800',   length: 600,  width: 800,  color: '#00CED1', label: '' },
  ],
  truckPreset: 'Semi-remorque 13.6m',
  allowRotation: true,
  groupContiguous: true,
  maxTrucks: 5,
  calcMode: 'calculate',
  packingDimension: '2d',
  marker: 800,
};

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password, entityName } = req.body;
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

  let entityId = null;
  if (entityName && entityName.trim()) {
    const trimmed = entityName.trim();
    // Check if entity exists
    const existingEntity = db.prepare('SELECT id FROM entities WHERE name = ?').get(trimmed);
    if (existingEntity) {
      entityId = existingEntity.id;
    } else {
      // Create entity with default settings
      const result = db.prepare('INSERT INTO entities (name, settings) VALUES (?, ?)').run(trimmed, JSON.stringify(DEFAULT_ENTITY_SETTINGS));
      entityId = result.lastInsertRowid;
    }
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password_hash, entity_id) VALUES (?, ?, ?, ?)').run(username, email, hash, entityId);
  const user = { id: result.lastInsertRowid, username, email, role: 'user', entity_id: entityId };
  const token = generateToken(user);

  // Include entity info
  let entity = null;
  if (entityId) {
    entity = db.prepare('SELECT id, name, settings FROM entities WHERE id = ?').get(entityId);
    if (entity && entity.settings) entity.settings = JSON.parse(entity.settings);
  }

  res.status(201).json({ user: { ...user, entity }, token });
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

  // Include entity info
  let entity = null;
  if (user.entity_id) {
    entity = db.prepare('SELECT id, name, settings FROM entities WHERE id = ?').get(user.entity_id);
    if (entity && entity.settings) entity.settings = JSON.parse(entity.settings);
  }

  res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, entity_id: user.entity_id, avatar: user.avatar, entity },
    token
  });
});

// GET /api/auth/me
const { authMiddleware } = require('../auth');
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, entity_id, avatar, created_at, preferences FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  user.preferences = user.preferences ? JSON.parse(user.preferences) : null;

  // Include entity info
  if (user.entity_id) {
    const entity = db.prepare('SELECT id, name, settings FROM entities WHERE id = ?').get(user.entity_id);
    if (entity && entity.settings) entity.settings = JSON.parse(entity.settings);
    user.entity = entity;
  }

  res.json({ user });
});

// PUT /api/auth/profile — update user profile (email, avatar, entity)
router.put('/profile', authMiddleware, (req, res) => {
  const { email, avatar, entityName } = req.body;
  const updates = [];
  const params = [];

  if (email) {
    // Check uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });
    updates.push('email = ?');
    params.push(email);
  }

  if (avatar !== undefined) {
    // avatar is a base64 data URL or null
    updates.push('avatar = ?');
    params.push(avatar || null);
  }

  if (entityName !== undefined) {
    if (entityName && entityName.trim()) {
      const trimmed = entityName.trim();
      let entity = db.prepare('SELECT id FROM entities WHERE name = ?').get(trimmed);
      if (!entity) {
        const r = db.prepare('INSERT INTO entities (name, settings) VALUES (?, ?)').run(trimmed, JSON.stringify(DEFAULT_ENTITY_SETTINGS));
        entity = { id: r.lastInsertRowid };
      }
      updates.push('entity_id = ?');
      params.push(entity.id);
    } else {
      updates.push('entity_id = NULL');
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier' });

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Return updated user
  const user = db.prepare('SELECT id, username, email, role, entity_id, avatar, created_at, preferences FROM users WHERE id = ?').get(req.user.id);
  user.preferences = user.preferences ? JSON.parse(user.preferences) : null;
  if (user.entity_id) {
    const entity = db.prepare('SELECT id, name, settings FROM entities WHERE id = ?').get(user.entity_id);
    if (entity && entity.settings) entity.settings = JSON.parse(entity.settings);
    user.entity = entity;
  }
  res.json({ user });
});

// PUT /api/auth/password — change password
router.put('/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Mots de passe requis' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Mot de passe modifié' });
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

// ── Entity routes ────────────────────────────────────────────

// GET /api/auth/entity — get current user's entity
router.get('/entity', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT entity_id FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.entity_id) return res.json({ entity: null });

  const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(user.entity_id);
  if (!entity) return res.json({ entity: null });
  entity.settings = entity.settings ? JSON.parse(entity.settings) : {};

  // Get entity members
  const members = db.prepare('SELECT id, username, email, role, avatar, created_at FROM users WHERE entity_id = ?').all(entity.id);
  entity.members = members;
  res.json({ entity });
});

// PUT /api/auth/entity/settings — update entity-level settings
router.put('/entity/settings', authMiddleware, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Champ settings requis (objet)' });
  }
  const user = db.prepare('SELECT entity_id FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.entity_id) return res.status(400).json({ error: 'Pas d\'entité associée' });

  const row = db.prepare('SELECT settings FROM entities WHERE id = ?').get(user.entity_id);
  const existing = row && row.settings ? JSON.parse(row.settings) : {};
  const merged = { ...existing, ...settings };
  db.prepare('UPDATE entities SET settings = ? WHERE id = ?').run(JSON.stringify(merged), user.entity_id);
  res.json({ settings: merged });
});

module.exports = router;
