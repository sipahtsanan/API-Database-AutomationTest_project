const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

function initDb() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      cid       TEXT PRIMARY KEY CHECK(length(cid) <= 13 AND cid GLOB '[0-9]*'),
      name      TEXT CHECK(length(name) <= 50),
      surname   TEXT CHECK(length(surname) <= 50),
      status    TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      delete_user INTEGER NOT NULL DEFAULT 0 CHECK(delete_user IN (0, 1))
    );
  `);

  console.log('✅ Database initialized: database.sqlite');
  console.log('✅ Table "user" created (if not exists)');
  db.close();
}

initDb();