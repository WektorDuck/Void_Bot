const Database = require('better-sqlite3');
const db = new Database('database.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    moderator TEXT NOT NULL,
    status TEXT NOT NULL,
    complaints TEXT,
    mini_complaints TEXT,
    appeals TEXT
  )
`).run();

module.exports = db;
