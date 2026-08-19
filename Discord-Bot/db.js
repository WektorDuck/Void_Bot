const Database = require('better-sqlite3');
const db = new Database('database.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moderator TEXT NOT NULL,
    complaint TEXT NOT NULL,
    url TEXT NOT NULL
  )
`).run();

module.exports = db;
