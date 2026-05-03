const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as creator_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status='done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as creator_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status='done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.created_by = u.id
      WHERE p.created_by = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
      ORDER BY p.created_at DESC
    `).all(req.user.id, req.user.id);
  }
  res.json(projects);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT p.*, u.name as creator_name FROM projects p JOIN users u ON p.created_by=u.id WHERE p.id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = db.prepare('SELECT u.id, u.name, u.email, u.role, u.avatar_color FROM project_members pm JOIN users u ON pm.user_id=u.id WHERE pm.project_id=?').all(req.params.id);
  res.json({ ...project, members });
});

router.post('/', adminOnly, (req, res) => {
  const db = getDb();
  const { name, description, color, deadline } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const result = db.prepare('INSERT INTO projects (name, description, color, deadline, created_by) VALUES (?,?,?,?,?)')
    .run(name, description || '', color || '#6366f1', deadline || null, req.user.id);
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?,?)').run(result.lastInsertRowid, req.user.id);
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

router.put('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const { name, description, status, color, deadline } = req.body;
  db.prepare('UPDATE projects SET name=?, description=?, status=?, color=?, deadline=? WHERE id=?')
    .run(name, description, status, color, deadline, req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
});

router.delete('/:id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE project_id=?').run(req.params.id);
  db.prepare('DELETE FROM project_members WHERE project_id=?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', adminOnly, (req, res) => {
  const db = getDb();
  const { user_id } = req.body;
  const existing = db.prepare('SELECT id FROM project_members WHERE project_id=? AND user_id=?').get(req.params.id, user_id);
  if (existing) return res.status(400).json({ error: 'Member already in project' });
  db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?,?)').run(req.params.id, user_id);
  res.json({ message: 'Member added' });
});

router.delete('/:id/members/:user_id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(req.params.id, req.params.user_id);
  res.json({ message: 'Member removed' });
});

module.exports = router;
