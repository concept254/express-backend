# concept254 Express Backend

Full stack blogging and developer ticketing platform API built with Express.js and PostgreSQL.

## Tech Stack
- Node.js + Express.js
- PostgreSQL
- bcrypt for password hashing
- Multer for file uploads
- Nodemailer for email notifications

## Setup

### Prerequisites
- Node.js v18+
- PostgreSQL

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```
PORT=4000
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=blog
DB_PASSWORD=your_db_password
DB_PORT=5432
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### Run Development Server
```bash
npm start
```

## API Routes

### Auth
- POST /api/auth/signin
- POST /api/auth/signup

### Tickets
- GET /api/tickets
- POST /api/tickets/create
- GET /api/tickets/:tid
- PUT /api/tickets/:tid/assign
- PUT /api/tickets/:tid/resolve
- PUT /api/tickets/:tid/close
- DELETE /api/tickets/:tid

### And more...