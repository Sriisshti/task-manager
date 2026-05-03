const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/signup', (req, res) => {
  const db = getDb();
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const colors = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];
  const avatar_color = colors[Math.floor(Math.random() * colors.length)];
  const hashed = bcrypt.hashSync(password, 10);
  const userRole = role === 'admin' ? 'admin' : 'member';
  const result = db.prepare('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, hashed, userRole, avatar_color);
  const user = { id: result.lastInsertRowid, name, email, role: userRole, avatar_color };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600*1000 });
  res.json({ user, token });
});

router.post('/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600*1000 });
  res.json({ user: payload, token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

module.exports = router;
