const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'adctrans.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS truck_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    length_cm REAL NOT NULL DEFAULT 1340,
    width_cm REAL NOT NULL DEFAULT 242,
    height_cm REAL NOT NULL DEFAULT 270,
    max_weight_kg REAL NOT NULL DEFAULT 24000,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS palette_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    length_mm REAL NOT NULL,
    width_mm REAL NOT NULL,
    height_mm REAL NOT NULL DEFAULT 1500,
    weight_kg REAL NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    truck_config TEXT,
    palette_data TEXT,
    result_data TEXT,
    settings TEXT,
    heuristic TEXT DEFAULT 'auto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calculation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    project_name TEXT,
    truck_config TEXT,
    palette_data TEXT,
    result_data TEXT,
    settings TEXT,
    heuristic TEXT,
    floor_meters REAL,
    total_palettes INTEGER,
    total_placed INTEGER,
    num_trucks INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: add settings column if missing (for existing databases)
try {
  db.prepare("SELECT settings FROM projects LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE projects ADD COLUMN settings TEXT");
}

// Migration: add preferences column to users table
try {
  db.prepare("SELECT preferences FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN preferences TEXT");
}

// Migration: add email column to users table (for older databases)
let emailColumnAdded = false;
try {
  db.prepare("SELECT email FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  emailColumnAdded = true;
}

if (emailColumnAdded) {
  db.exec("UPDATE users SET email = username WHERE email IS NULL OR email = ''");
}

try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)");
} catch (e) {
  // ignore index creation errors on legacy data
}

// Migration: add entity_id column to users table
try {
  db.prepare("SELECT entity_id FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL");
}

// Migration: add avatar column to users table
try {
  db.prepare("SELECT avatar FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
}

// Migration: add entity_id column to projects table
try {
  db.prepare("SELECT entity_id FROM projects LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE projects ADD COLUMN entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE");
}

// Insert default palette templates if none exist
const count = db.prepare('SELECT COUNT(*) as c FROM palette_templates WHERE user_id IS NULL').get();
if (count.c === 0) {
  const insertPalette = db.prepare(
    'INSERT INTO palette_templates (name, length_mm, width_mm, height_mm, weight_kg) VALUES (?, ?, ?, ?, ?)'
  );
  const defaults = [
    ['Euro 800x1200', 800, 1200, 1500, 500],
    ['Euro 1000x1200', 1000, 1200, 1500, 600],
    ['Euro 600x800', 600, 800, 1500, 300],
    ['Demi 600x1200', 600, 1200, 1500, 350],
    ['Industrielle 1000x1200', 1000, 1200, 1800, 700],
    ['Quart 400x600', 400, 600, 1000, 150],
  ];
  const insertMany = db.transaction((palettes) => {
    for (const p of palettes) insertPalette.run(...p);
  });
  insertMany(defaults);
}

// Insert default truck template if none exist
const truckCount = db.prepare('SELECT COUNT(*) as c FROM truck_templates WHERE user_id IS NULL').get();
if (truckCount.c === 0) {
  db.prepare(
    'INSERT INTO truck_templates (name, length_cm, width_cm, height_cm, max_weight_kg) VALUES (?, ?, ?, ?, ?)'
  ).run('Semi-remorque standard', 1340, 242, 270, 24000);
}

module.exports = db;
