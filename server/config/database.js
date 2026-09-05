// server/config/database.js
const path = require('path');
require('dotenv').config();

const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, '../../peoplepay.sqlite');

const config = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DB_CLIENT === 'pg' ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  } : (process.env.DB_CLIENT === 'mysql2' || process.env.DB_CLIENT === 'mysql') ? {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'peoplepay360',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    timezone: '+05:30'
  } : {
    filename: dbPath
  },
  useNullAsDefault: true,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    afterCreate: (conn, cb) => {
      if (!process.env.DB_CLIENT || process.env.DB_CLIENT === 'sqlite3') {
        // Enable Foreign Keys and WAL mode in SQLite for concurrency and integrity
        conn.run('PRAGMA foreign_keys = ON;', () => {
          conn.run('PRAGMA journal_mode = WAL;', () => {
            conn.run('PRAGMA busy_timeout = 10000;', cb);
          });
        });
      } else {
        cb(null, conn);
      }
    }
  }
};

module.exports = config;
