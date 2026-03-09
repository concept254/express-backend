const { Pool } = require('pg')
require('dotenv').config()

// Use DATABASE_URL in production (DigitalOcean injects this automatically)
// Fall back to individual env variables for local development
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false  // required for DigitalOcean managed databases
      }
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT
    })

module.exports = pool