const pool = require('../db')
const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10

const hashExistingPasswords = async () => {
  try {
    console.log('Fetching all users...')
    const result = await pool.query(`SELECT uid, username, pwd FROM users`)
    const users = result.rows

    for (const user of users) {
      // Skip already hashed passwords (bcrypt hashes start with $2b$)
      if (user.pwd && user.pwd.startsWith('$2b$')) {
        console.log(`Skipping ${user.username} — already hashed`)
        continue
      }

      if (!user.pwd) {
        console.log(`Skipping ${user.username} — no password set`)
        continue
      }

      const hashed = await bcrypt.hash(user.pwd, SALT_ROUNDS)
      await pool.query(`UPDATE users SET pwd=$1 WHERE uid=$2`, [hashed, user.uid])
      console.log(`✅ Hashed password for ${user.username}`)
    }

    console.log('All passwords hashed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('Error hashing passwords:', err)
    process.exit(1)
  }
}

hashExistingPasswords()