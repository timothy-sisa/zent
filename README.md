# ZENT – Centralized Academic Resource Platform
### Web Technologies – Assignment 2: Server-side Components

**Authors:** Timothy Sisa (3142650) · Alazar Kidane (3136216) · Adarsh Pandit (3134329)
**Module:** Web Technologies · Semester 2 · Griffith College Dublin
**Deployed URL:** https://zent-m8ay.onrender.com

---

## What This Is

ZENT is a REST API backend for a student-driven academic resource sharing platform. It allows students and lecturers to register accounts, upload study materials, browse and search the resource library, rate and comment on resources, and manage their own collections. The API is built with Node.js and Express, uses MongoDB for all data storage including file storage via GridFS, and manages user state through server-side sessions and cookies.

---

## Installation

### Prerequisites
- Node.js v18 or higher
- A MongoDB Atlas account (free tier is fine)

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/your-username/zent.git
cd zent
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your environment file**
```bash
copy .env.example .env
```

Open `.env` and fill in the following values:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/zentdb
SESSION_SECRET=any_long_random_string
PORT=3000
NODE_ENV=development
```

To generate a secure SESSION_SECRET run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**4. Start the server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`. Hit `GET /` to confirm it is running — you should see:
```json
{ "message": "ZENT Academic Resource Platform API is running.", "version": "1.0.0" }
```

---

## API Overview

The API is organised into three groups of routes.

### Auth — `/api/auth`
Handles everything related to user accounts. Users register with a username, email, password, and optional role (student or lecturer). On login a session is created server-side and a role cookie is set on the client. Logout destroys the session and clears all cookies. The `/me` endpoint returns the current user's profile and their saved favourites.

### Resources — `/api/resources`
The core of the platform. Authenticated users can upload academic files (PDF, Word, PowerPoint, plain text) along with a title, description, category, and resource type. Resources can be browsed publicly with support for full-text search, type filtering, category filtering, and sorting by date, rating, or view count. Results are paginated. Individual resources can be updated or deleted by their uploader or any lecturer. Each resource view is counted and tracked in the session for the recently viewed feature. Users can submit a star rating between 1 and 5, and toggle resources in and out of their favourites list. Files are stored in MongoDB GridFS and can be downloaded via the file endpoint.

### Users — `/api/users`
Allows users to view all resources uploaded by a specific account and update their own username or email.

---

## Project Structure

```
zent/
├── server.js              # App entry point
├── config/db.js           # MongoDB connection
├── models/                # Mongoose schemas for User, Resource, Comment
├── middleware/            # Session auth guard and Multer file upload config
├── controllers/           # Business logic for auth, resources, and comments
├── routes/                # Express route definitions for each API group
├── .env.example           # Environment variable template
└── README.md
```

---

## Division of Labour

| Member | Contributions | % |
|---|---|---|
| Timothy Sisa (3142650) | server.js, session and cookie config, auth routes and controller, User model, MongoDB connection | 33.5% |
| Alazar Kidane (3136216) | Resource model and controller, upload middleware, GridFS integration, Render hosting | 33.5% |
| Adarsh Pandit (3134329) | Comment model and controller, user routes, README, Render deployment, API testing | 33% |

---

## References

- Express.js: https://expressjs.com/
- Mongoose: https://mongoosejs.com/docs/
- express-session: https://www.npmjs.com/package/express-session
- connect-mongo: https://www.npmjs.com/package/connect-mongo
- Multer: https://www.npmjs.com/package/multer
- express-validator: https://express-validator.github.io/docs/
- bcryptjs: https://www.npmjs.com/package/bcryptjs
- MongoDB GridFS: https://www.mongodb.com/docs/drivers/node/current/fundamentals/gridfs/
- Render deployment: https://render.com/docs/deploy-node-express-app
