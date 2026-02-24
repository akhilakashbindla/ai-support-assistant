const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Initialize the database connection
async function setupDB() {
  const db = await open({
    // Use the Railway volume path if it exists, otherwise use the local file
    filename: process.env.DB_FILE_PATH || './chat.sqlite',
    driver: sqlite3.Database
  });

  // Create Tables per assignment requirements
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      role TEXT CHECK( role IN ('user','assistant') ),
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );
  `);

  console.log('✅ SQLite Database connected and tables initialized.');
  return db;
}

module.exports = { setupDB };