const Database = require('better-sqlite3');

const db = new Database('database.db');

db.prepare(
    'CREATE TABLE IF NOT EXISTS complaints (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'role TEXT, ' +
    'moderator TEXT NOT NULL, ' +
    'status TEXT, ' +
    'complaints TEXT, ' +
    'mini_complaints TEXT, ' +
    'appeals TEXT, ' +
    'complaint TEXT, ' +
    'url TEXT' +
    ')'
).run();

function getColumns() {
    return db
        .prepare('PRAGMA table_info(complaints)')
        .all()
        .map(function (column) {
            return column.name;
        });
}

let columns = getColumns();

if (!columns.includes('complaint')) {
    console.log('Миграция БД: complaint');

    db.prepare(
        'ALTER TABLE complaints ADD COLUMN complaint TEXT'
    ).run();
}

columns = getColumns();

if (!columns.includes('url')) {
    console.log('Миграция БД: url');

    db.prepare(
        'ALTER TABLE complaints ADD COLUMN url TEXT'
    ).run();
}

columns = getColumns();

if (
    columns.includes('complaints') &&
    columns.includes('complaint')
) {
    db.prepare(
        "UPDATE complaints " +
        "SET complaint = complaints " +
        "WHERE (complaint IS NULL OR complaint = '') " +
        "AND complaints IS NOT NULL " +
        "AND complaints != ''"
    ).run();
}

console.log('База данных инициализирована');

module.exports = db;
