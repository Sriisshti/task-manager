const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/project/:project_id', (req, res) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.project_id);
  res.json(tasks);
});

router.get('/my', (req, res) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.assigned_to = ? OR t.created_by = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(tasks);
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  let stats;
  if (req.user.role === 'admin') {
    stats = {
      total_tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
      todo: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='todo'").get().c,
      in_progress: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='in_progress'").get().c,
      done: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done'").get().c,
      overdue: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE deadline < ? AND status != 'done'").get(today).c,
      total_projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
      total_members: db.prepare("SELECT COUNT(*) as c FROM users WHERE role='member'").get().c,
    };
  } else {
    stats = {
      total_tasks: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assigned_to=? OR created_by=?').get(req.user.id, req.user.id).c,
      todo: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='todo' AND (assigned_to=? OR created_by=?)").get(req.user.id, req.user.id).c,
      in_progress: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='in_progress' AND (assigned_to=? OR created_by=?)").get(req.user.id, req.user.id).c,
      done: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done' AND (assigned_to=? OR created_by=?)").get(req.user.id, req.user.id).c,
      overdue: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE deadline < ? AND status != 'done' AND (assigned_to=? OR created_by=?)").get(today, req.user.id, req.user.id).c,
      total_projects: db.prepare('SELECT COUNT(DISTINCT project_id) as c FROM project_members WHERE user_id=?').get(req.user.id).c,
      total_members: 0,
    };
  }
  res.json(stats);
});

router.post('/', adminOnly, (req, res) => {
  const db = getDb();
  const { title, description, status, priority, project_id, assigned_to, deadline } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project required' });
  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, deadline, created_by)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(title, description || '', status || 'todo', priority || 'medium', project_id, assigned_to || null, deadline || null, req.user.id);
  const task = db.prepare('SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.id=?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role !== 'admin' && task.assigned_to !== req.user.id)
    return res.status(403).json({ error: 'Not authorized' });

  const { title, description, status, priority, assigned_to, deadline } = req.body;
  if (req.user.role === 'admin') {
    db.prepare(`UPDATE tasks SET title=?, description=?, status=?, priority=?, assigned_to=?, deadline=?, updated_at=datetime('now') WHERE id=?`)
      .run(title ?? task.title, description ?? task.description, status ?? task.status, priority ?? task.priority,
           assigned_to !== undefined ? (assigned_to || null) : task.assigned_to, deadline ?? task.deadline, req.params.id);
  } else {
    db.prepare(`UPDATE tasks SET status=?, updated_at=datetime('now') WHERE id=?`)
      .run(status ?? task.status, req.params.id);
  }
  const updated = db.prepare('SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.id=?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
