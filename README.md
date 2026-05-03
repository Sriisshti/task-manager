# 🚀 TaskFlow — Team Task Manager

A full-stack Team Task Manager with Role-Based Access Control (Admin/Member), built with HTML, CSS, JavaScript, Node.js, Express, and SQLite.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcrypt |
| Deployment | Railway |

---

## ✨ Features

- **Authentication** — Signup / Login with JWT tokens
- **Role-Based Access** — Admin (full control) vs Member (view + update own tasks)
- **Project Management** — Create, edit, delete projects with color coding
- **Task Management** — Kanban board (Todo / In Progress / Done), priorities, deadlines
- **Team Management** — Add/remove members from projects, admin panel
- **Dashboard** — Stats cards, recent tasks, project progress
- **Responsive UI** — Works on mobile and desktop

---

## 🔐 Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | admin123 | Admin |
| member@demo.com | member123 | Member |

---

## 💻 Local Setup

```bash
# 1. Clone or extract the project
cd task-manager

# 2. Install dependencies
npm install

# 3. Start server
npm start
# or for development with auto-reload:
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## 🚂 Deploy to Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/task-manager.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects Node.js and deploys
5. Go to **Settings** → **Domains** → Generate domain

### Step 3: Environment Variables (optional)
In Railway dashboard → Variables, you can set:
```
JWT_SECRET=your_super_secret_key_here
PORT=3000
```

That's it! Your app will be live in ~2 minutes.

---

## 📁 Project Structure

```
task-manager/
├── server.js           # Express app entry point
├── db.js               # SQLite database + schema
├── package.json
├── railway.toml        # Railway deployment config
├── middleware/
│   └── auth.js         # JWT auth + admin middleware
├── routes/
│   ├── auth.js         # /api/auth/* (login, signup, logout)
│   ├── projects.js     # /api/projects/*
│   ├── tasks.js        # /api/tasks/*
│   └── users.js        # /api/users/*
└── public/
    ├── index.html      # Single Page App shell
    ├── css/
    │   └── style.css   # Full styling
    └── js/
        └── app.js      # Frontend logic
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/signup` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout

### Projects (Admin required for create/edit/delete)
- `GET /api/projects` — List all projects
- `GET /api/projects/:id` — Project details + members
- `POST /api/projects` — Create project
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project
- `POST /api/projects/:id/members` — Add member
- `DELETE /api/projects/:id/members/:user_id` — Remove member

### Tasks
- `GET /api/tasks/project/:project_id` — Tasks in a project
- `GET /api/tasks/my` — My tasks (assigned or created)
- `GET /api/tasks/stats` — Dashboard statistics
- `POST /api/tasks` — Create task (Admin only)
- `PUT /api/tasks/:id` — Update task (Admin: full edit; Member: status only)
- `DELETE /api/tasks/:id` — Delete task (Admin only)

### Users (Admin only)
- `GET /api/users` — List all users
- `GET /api/users/me` — Current user profile
- `DELETE /api/users/:id` — Delete user

---

## 🎥 Demo Video Tips (2–5 min)
1. Show login as Admin → Dashboard
2. Create a new Project
3. Add tasks with different priorities
4. Assign tasks to member
5. Login as Member → show restricted access
6. Member updates task status
7. Show Kanban board and progress

---

Made with ❤️ for college project
