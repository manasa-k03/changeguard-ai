const knex = require('knex');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/changeguard.db';
const dbDir = path.dirname(path.resolve(dbPath));

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.resolve(dbPath),
  },
  useNullAsDefault: true,
  // pool min:1 so one connection is kept alive for the server lifetime
  pool: { min: 1, max: 1 },
});

// Initialize tables — returns a promise; server.js awaits this before listen()
const initDb = async () => {
  // WAL mode for better concurrent read performance
  await db.raw('PRAGMA journal_mode=WAL');
  await db.raw('PRAGMA foreign_keys=ON');

  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.string('id').primary();
      t.string('name').notNullable();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('  ✔ Created table: users');
  }

  const hasAnalyses = await db.schema.hasTable('analyses');
  if (!hasAnalyses) {
    await db.schema.createTable('analyses', (t) => {
      t.string('id').primary();
      t.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('title').notNullable();
      t.text('input_text').notNullable();
      t.text('result').notNullable();
      t.string('risk_level').notNullable().defaultTo('medium');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    await db.schema.table('analyses', (t) => {
      t.index(['user_id']);
      t.index(['created_at']);
    });
    console.log('  ✔ Created table: analyses');
  }

  console.log('  ✔ Database ready');
};

// Export both db and initDb so server.js can await startup
module.exports = { db, initDb };
