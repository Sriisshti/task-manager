const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskmanager.db');

let dbInstance = null;

function makeWrapper(sqlDb) {
  function persist() {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  function prepare(sql) {
    return {
      get(...params) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        let row = undefined;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      all(...params) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run(...params) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        const lastInsertRowid = sqlDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] || 0;
        persist();
        return { lastInsertRowid, changes: sqlDb.getRowsModified() };
      }
    };
  }

  function exec(sql) {
    sqlDb.run(sql);
    persist();
  }

  function pragma(str) {
    try { sqlDb.run(`PRAGMA ${str}`); } catch(e) {}
  }

  return { prepare, exec, pragma };
}

async function initDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const db = makeWrapper(sqlDb);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar_color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      color TEXT DEFAULT '#6366f1',
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      deadline TEXT
    );
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assigned_to INTEGER,
      created_by INTEGER NOT NULL,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.com');
  if (!adminExists) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, 'admin', '#f43f5e')")
      .run('Admin User', 'admin@demo.com', adminHash);
    const memberHash = bcrypt.hashSync('member123', 10);
    db.prepare("INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, 'member', '#10b981')")
      .run('Jane Member', 'member@demo.com', memberHash);
    console.log('✅ Demo accounts created: admin@demo.com / admin123 | member@demo.com / member123');
  }

  dbInstance = db;
  return db;
}

module.exports = { initDb, getDb: () => dbInstance };
