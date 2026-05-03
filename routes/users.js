const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', adminOnly, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, avatar_color, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.get('/me', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, avatar_color, created_at FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

router.delete('/:id', adminOnly, (req, res) => {
  const db = getDb();
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
