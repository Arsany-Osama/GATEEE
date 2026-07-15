const knex = require('knex');
require('../config/loadEnv');

// Set up the Knex instance with our database credentials
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: { min: 0, max: 7 } // Manages database connection pool
});

// Test the connection when this file runs
db.raw('SELECT 1')
  .then(() => {
    console.log('MySQL connected successfully via Knex!');
  })
  .catch((err) => {
    console.error('MySQL connection failed:', err.message);
  });

module.exports = db;
