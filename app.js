const express = require('express')
const cors = require('cors')
require('dotenv').config();
const app = express()
var pool = require('./db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// File filter — allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/json',
    'text/javascript', 'text/css', 'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('File type not allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB limit
})

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'))

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// ── Auth: Sign In ─────────────────────────────────────
app.post('/api/auth/signin', async (req, res) => {
  const { email, pwd } = req.body
  pool.query(
    `SELECT * FROM users WHERE email=$1`,
    [email],
    async (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      if (q_res.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const user = q_res.rows[0]

      try {
        // Compare entered password with hashed password
        const validPassword = await bcrypt.compare(pwd, user.pwd)
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid email or password' })
        }

        // Never return the password in the response
        const { pwd: _, ...userWithoutPwd } = user
        res.json([userWithoutPwd])
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    }
  )
})

// ── Auth: Sign Up ─────────────────────────────────────
app.post('/api/auth/signup', (req, res) => {
  const { username, email, pwd, role } = req.body
  pool.query(
    `SELECT * FROM users WHERE email=$1`,
    [email],
    async (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      if (q_res.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' })
      }
      try {
        // Hash the password before storing
        const hashedPwd = await bcrypt.hash(pwd, SALT_ROUNDS)
        pool.query(
          `INSERT INTO users (username, email, pwd, role, email_verified, date_created, last_login)
           VALUES ($1, $2, $3, $4, false, NOW(), NOW()) RETURNING *`,
          [username, email, hashedPwd, role || 'client'],
          (q_err2, q_res2) => {
            if (q_err2) return res.status(500).json({ error: q_err2.message })
            // Never return the password in the response
            const { pwd, ...userWithoutPwd } = q_res2.rows[0]
            res.json(userWithoutPwd)
          }
        )
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    }
  )
})

// ── Posts: Get All Posts ──────────────────────────────
app.get('/api/get/allposts', (req, res) => {
  pool.query(
    `SELECT posts.*, users.username 
     FROM posts 
     LEFT JOIN users ON posts.user_id = users.uid 
     ORDER BY posts.date_created DESC`,
    (q_err, q_res) => {
      if (q_err) {
        return res.status(500).json({ error: q_err.message })
      }
      res.json(q_res.rows)
    }
  )
})

// ── Posts: Get Single Post ────────────────────────────
app.get('/api/get/post/:pid', (req, res) => {
  const { pid } = req.params
  pool.query(
    `SELECT * FROM posts WHERE pid=$1`,
    [pid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Comments: Get Comments for a Post ────────────────
app.get('/api/get/comments/:pid', (req, res) => {
  const { pid } = req.params
  pool.query(
    `SELECT * FROM comments WHERE post_id=$1 ORDER BY date_created ASC`,
    [pid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// ── Comments: Add a Comment ───────────────────────────
app.post('/api/post/comment', (req, res) => {
  const { comment, author, user_id, post_id } = req.body
  pool.query(
    `INSERT INTO comments (comment, author, user_id, post_id, date_created)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [comment, author, user_id, post_id],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Posts: Create Post ────────────────────────────────
app.post('/api/post/createpost', (req, res) => {
  const { title, body, user_id, author } = req.body

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' })
  }

  pool.query(
    `INSERT INTO posts (title, body, user_id, author, date_created, likes)
     VALUES ($1, $2, $3, $4, NOW(), 0) RETURNING *`,
    [title, body, user_id, author],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Posts: Like a Post ────────────────────────────────
app.put('/api/post/like/:pid', (req, res) => {
  const { pid } = req.params
  pool.query(
    `UPDATE posts SET likes = likes + 1 WHERE pid=$1 RETURNING *`,
    [pid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Posts: Delete Post ────────────────────────────────
app.delete('/api/post/delete/:pid', (req, res) => {
  const { pid } = req.params
  pool.query(
    `DELETE FROM posts WHERE pid=$1 RETURNING *`,
    [pid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Posts: Edit Post ──────────────────────────────────
app.put('/api/post/edit/:pid', (req, res) => {
  const { pid } = req.params
  const { title, body } = req.body

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' })
  }

  pool.query(
    `UPDATE posts SET title=$1, body=$2 WHERE pid=$3 RETURNING *`,
    [title, body, pid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ── Users: Get User Profile with Posts ────────────────
app.get('/api/get/userprofile/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT posts.*, users.username, users.email, users.date_created as member_since
     FROM posts
     LEFT JOIN users ON posts.user_id = users.uid
     WHERE users.uid=$1
     ORDER BY posts.date_created DESC`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// ══════════════════════════════════════════════════════
// TICKET ROUTES
// ══════════════════════════════════════════════════════

// Get all open tickets
app.get('/api/tickets', (req, res) => {
  pool.query(
    `SELECT tickets.*, users.username as client_name
     FROM tickets
     LEFT JOIN users ON tickets.client_id = users.uid
     WHERE tickets.status = 'open'
     ORDER BY tickets.date_created DESC`,
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// Get single ticket
app.get('/api/tickets/:tid', (req, res) => {
  const { tid } = req.params
  pool.query(
    `SELECT tickets.*,
     c.username as client_name,
     d.username as developer_name
     FROM tickets
     LEFT JOIN users c ON tickets.client_id = c.uid
     LEFT JOIN users d ON tickets.developer_id = d.uid
     WHERE tickets.tid=$1`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// Create ticket
app.post('/api/tickets/create', (req, res) => {
  const { title, description, category, budget, client_id } = req.body
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' })
  }
  pool.query(
    `INSERT INTO tickets (title, description, category, budget, client_id, status, date_created, date_updated)
     VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW()) RETURNING *`,
    [title, description, category, budget, client_id],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      pool.query(
        `INSERT INTO notifications (user_id, message, ticket_id)
         SELECT uid, $1, $2 FROM users WHERE role = 'developer'`,
        [`New ticket available: ${title}`, q_res.rows[0].tid],
        () => {}
      )
      res.json(q_res.rows[0])
    }
  )
})

// Assign ticket to developer
app.put('/api/tickets/:tid/assign', (req, res) => {
  const { tid } = req.params
  const { developer_id } = req.body
  pool.query(
    `UPDATE tickets SET developer_id=$1, status='in_progress', date_updated=NOW()
     WHERE tid=$2 RETURNING *`,
    [developer_id, tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      const ticket = q_res.rows[0]
      pool.query(
        `INSERT INTO notifications (user_id, message, ticket_id) VALUES ($1, $2, $3)`,
        [ticket.client_id, 'A developer has picked up your ticket', tid],
        () => {}
      )
      res.json(ticket)
    }
  )
})

// Resolve ticket
app.put('/api/tickets/:tid/resolve', (req, res) => {
  const { tid } = req.params
  pool.query(
    `UPDATE tickets SET status='resolved', date_updated=NOW(), date_resolved=NOW()
     WHERE tid=$1 RETURNING *`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      const ticket = q_res.rows[0]
      pool.query(
        `INSERT INTO notifications (user_id, message, ticket_id) VALUES ($1, $2, $3)`,
        [ticket.client_id, 'Your ticket has been resolved. Please review and close.', tid],
        () => {}
      )
      res.json(ticket)
    }
  )
})

// Close ticket
app.put('/api/tickets/:tid/close', (req, res) => {
  const { tid } = req.params
  pool.query(
    `UPDATE tickets SET status='closed', date_updated=NOW()
     WHERE tid=$1 RETURNING *`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      const ticket = q_res.rows[0]
      pool.query(
        `INSERT INTO notifications (user_id, message, ticket_id) VALUES ($1, $2, $3)`,
        [ticket.developer_id, 'The client has closed the ticket.', tid],
        () => {}
      )
      res.json(ticket)
    }
  )
})

// Delete ticket
app.delete('/api/tickets/:tid', (req, res) => {
  const { tid } = req.params
  pool.query(
    `DELETE FROM tickets WHERE tid=$1 RETURNING *`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ══════════════════════════════════════════════════════
// TICKET MESSAGES ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/tickets/:tid/messages', (req, res) => {
  const { tid } = req.params
  pool.query(
    `SELECT ticket_messages.*, users.username as sender_name, users.role as sender_role
     FROM ticket_messages
     LEFT JOIN users ON ticket_messages.sender_id = users.uid
     WHERE ticket_id=$1
     ORDER BY date_created ASC`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

app.post('/api/tickets/:tid/messages', (req, res) => {
  const { tid } = req.params
  const { sender_id, message } = req.body
  pool.query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, message)
     VALUES ($1, $2, $3) RETURNING *`,
    [tid, sender_id, message],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      pool.query(
        `SELECT client_id, developer_id FROM tickets WHERE tid=$1`, [tid],
        (err, ticketRes) => {
          if (!err && ticketRes.rows[0]) {
            const { client_id, developer_id } = ticketRes.rows[0]
            const notify_id = sender_id === client_id ? developer_id : client_id
            if (notify_id) {
              pool.query(
                `INSERT INTO notifications (user_id, message, ticket_id) VALUES ($1, $2, $3)`,
                [notify_id, 'You have a new message on your ticket', tid],
                () => {}
              )
            }
          }
        }
      )
      res.json(q_res.rows[0])
    }
  )
})

// ══════════════════════════════════════════════════════
// NOTIFICATION ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/notifications/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY date_created DESC`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

app.put('/api/notifications/:nid/read', (req, res) => {
  const { nid } = req.params
  pool.query(
    `UPDATE notifications SET is_read=true WHERE nid=$1 RETURNING *`,
    [nid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ══════════════════════════════════════════════════════
// REVIEW ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/reviews/create', (req, res) => {
  const { ticket_id, reviewer_id, reviewee_id, rating, comment } = req.body
  pool.query(
    `INSERT INTO reviews (ticket_id, reviewer_id, reviewee_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [ticket_id, reviewer_id, reviewee_id, rating, comment],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

app.get('/api/reviews/developer/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT reviews.*, users.username as reviewer_name
     FROM reviews
     LEFT JOIN users ON reviews.reviewer_id = users.uid
     WHERE reviews.reviewee_id=$1
     ORDER BY reviews.date_created DESC`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// ══════════════════════════════════════════════════════
// USER ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/users/profile/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT uid, username, email, role, email_verified, date_created FROM users WHERE uid=$1`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

app.put('/api/users/profile/update', (req, res) => {
  const { uid, username, email } = req.body
  pool.query(
    `UPDATE users SET username=$1, email=$2 WHERE uid=$3 RETURNING *`,
    [username, email, uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// Get tickets for a specific client
app.get('/api/tickets/client/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT tickets.*, users.username as developer_name
     FROM tickets
     LEFT JOIN users ON tickets.developer_id = users.uid
     WHERE tickets.client_id=$1
     ORDER BY tickets.date_created DESC`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// Get tickets assigned to a specific developer
app.get('/api/tickets/developer/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `SELECT tickets.*, users.username as client_name
     FROM tickets
     LEFT JOIN users ON tickets.client_id = users.uid
     WHERE tickets.developer_id=$1
     ORDER BY tickets.date_created DESC`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// ══════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════

// Get platform stats
app.get('/api/admin/stats', (req, res) => {
  Promise.all([
    pool.query(`SELECT COUNT(*) FROM users`),
    pool.query(`SELECT COUNT(*) FROM users WHERE role='client'`),
    pool.query(`SELECT COUNT(*) FROM users WHERE role='developer'`),
    pool.query(`SELECT COUNT(*) FROM tickets`),
    pool.query(`SELECT COUNT(*) FROM tickets WHERE status='open'`),
    pool.query(`SELECT COUNT(*) FROM tickets WHERE status='in_progress'`),
    pool.query(`SELECT COUNT(*) FROM tickets WHERE status='closed'`),
    pool.query(`SELECT COUNT(*) FROM posts`),
    pool.query(`SELECT COUNT(*) FROM comments`),
    pool.query(`SELECT COALESCE(SUM(budget), 0) FROM tickets WHERE status='closed'`),
  ]).then(([
    totalUsers, clients, developers,
    totalTickets, openTickets, inProgressTickets, closedTickets,
    totalPosts, totalComments, totalRevenue
  ]) => {
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      clients: parseInt(clients.rows[0].count),
      developers: parseInt(developers.rows[0].count),
      totalTickets: parseInt(totalTickets.rows[0].count),
      openTickets: parseInt(openTickets.rows[0].count),
      inProgressTickets: parseInt(inProgressTickets.rows[0].count),
      closedTickets: parseInt(closedTickets.rows[0].count),
      totalPosts: parseInt(totalPosts.rows[0].count),
      totalComments: parseInt(totalComments.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].coalesce)
    })
  }).catch(err => res.status(500).json({ error: err.message }))
})

// Get all users
app.get('/api/admin/users', (req, res) => {
  pool.query(
    `SELECT uid, username, email, role, email_verified, date_created, last_login
     FROM users ORDER BY date_created DESC`,
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// Update user role
app.put('/api/admin/users/:uid/role', (req, res) => {
  const { uid } = req.params
  const { role } = req.body
  pool.query(
    `UPDATE users SET role=$1 WHERE uid=$2 RETURNING *`,
    [role, uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// Delete user
app.delete('/api/admin/users/:uid', (req, res) => {
  const { uid } = req.params
  pool.query(
    `DELETE FROM users WHERE uid=$1 RETURNING *`,
    [uid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// Get all tickets (admin view)
app.get('/api/admin/tickets', (req, res) => {
  pool.query(
    `SELECT tickets.*,
     c.username as client_name,
     d.username as developer_name
     FROM tickets
     LEFT JOIN users c ON tickets.client_id = c.uid
     LEFT JOIN users d ON tickets.developer_id = d.uid
     ORDER BY tickets.date_created DESC`,
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// Delete ticket (admin)
app.delete('/api/admin/tickets/:tid', (req, res) => {
  const { tid } = req.params
  pool.query(
    `DELETE FROM tickets WHERE tid=$1 RETURNING *`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// ══════════════════════════════════════════════════════
// ATTACHMENT ROUTES
// ══════════════════════════════════════════════════════

// Upload attachment to ticket
app.post('/api/tickets/:tid/attachments', upload.single('file'), (req, res) => {
  const { tid } = req.params
  const { sender_id } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  pool.query(
    `INSERT INTO ticket_attachments (ticket_id, sender_id, filename, originalname, mimetype, size)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tid, sender_id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows[0])
    }
  )
})

// Get attachments for a ticket
app.get('/api/tickets/:tid/attachments', (req, res) => {
  const { tid } = req.params
  pool.query(
    `SELECT ticket_attachments.*, users.username as sender_name
     FROM ticket_attachments
     LEFT JOIN users ON ticket_attachments.sender_id = users.uid
     WHERE ticket_id=$1
     ORDER BY date_created ASC`,
    [tid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

// Delete attachment
app.delete('/api/tickets/attachments/:aid', (req, res) => {
  const { aid } = req.params
  pool.query(
    `DELETE FROM ticket_attachments WHERE aid=$1 RETURNING *`,
    [aid],
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })

      // Delete file from disk
      const filename = q_res.rows[0]?.filename
      if (filename) {
        const filePath = path.join(__dirname, 'uploads', filename)
        fs.unlink(filePath, (err) => {
          if (err) console.error('Failed to delete file:', err)
        })
      }
      res.json(q_res.rows[0])
    }
  )
})

// ── Developer Public Profile ──────────────────────────
app.get('/api/users/developer/:uid', (req, res) => {
  const { uid } = req.params
  Promise.all([
    // Developer info
    pool.query(
      `SELECT uid, username, email, role, email_verified, date_created
       FROM users WHERE uid=$1 AND role='developer'`,
      [uid]
    ),
    // Completed tickets
    pool.query(
      `SELECT tickets.*, users.username as client_name
       FROM tickets
       LEFT JOIN users ON tickets.client_id = users.uid
       WHERE tickets.developer_id=$1
       AND tickets.status IN ('resolved', 'closed')
       ORDER BY tickets.date_resolved DESC`,
      [uid]
    ),
    // Reviews
    pool.query(
      `SELECT reviews.*, users.username as reviewer_name
       FROM reviews
       LEFT JOIN users ON reviews.reviewer_id = users.uid
       WHERE reviews.reviewee_id=$1
       ORDER BY reviews.date_created DESC`,
      [uid]
    ),
    // Stats
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'closed') as completed,
         COUNT(*) FILTER (WHERE status = 'in_progress') as active,
         COALESCE(AVG(budget) FILTER (WHERE status = 'closed'), 0) as avg_budget,
         COALESCE(SUM(budget) FILTER (WHERE status = 'closed'), 0) as total_earned
       FROM tickets WHERE developer_id=$1`,
      [uid]
    )
  ]).then(([developerRes, ticketsRes, reviewsRes, statsRes]) => {
    if (developerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Developer not found' })
    }
    res.json({
      developer: developerRes.rows[0],
      tickets: ticketsRes.rows,
      reviews: reviewsRes.rows,
      stats: statsRes.rows[0]
    })
  }).catch(err => res.status(500).json({ error: err.message }))
})

// Get all developers — for clients to browse
app.get('/api/users/developers', (req, res) => {
  pool.query(
    `SELECT u.uid, u.username, u.email, u.date_created,
     COUNT(t.tid) FILTER (WHERE t.status = 'closed') as completed_tickets,
     COALESCE(AVG(r.rating), 0) as avg_rating,
     COUNT(r.rid) as total_reviews
     FROM users u
     LEFT JOIN tickets t ON t.developer_id = u.uid
     LEFT JOIN reviews r ON r.reviewee_id = u.uid
     WHERE u.role = 'developer'
     GROUP BY u.uid
     ORDER BY avg_rating DESC`,
    (q_err, q_res) => {
      if (q_err) return res.status(500).json({ error: q_err.message })
      res.json(q_res.rows)
    }
  )
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Concept254 API running on port ${port}`)
})