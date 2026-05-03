/* ============================================================
   TaskFlow — Main App JS
   ============================================================ */

let currentUser = null;
let allTasks = [];
let allProjects = [];

// ---- INIT ----
window.onload = () => {
  const stored = localStorage.getItem('tf_user');
  const token = localStorage.getItem('tf_token');
  if (stored && token) {
    currentUser = JSON.parse(stored);
    showApp();
  } else {
    showAuth();
  }
};

function showAuth() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Set user info in sidebar
  const av = document.getElementById('sidebar-avatar');
  av.textContent = currentUser.name[0].toUpperCase();
  av.style.background = currentUser.avatar_color || '#6366f1';
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role;

  // Show admin-only items
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  showPage('dashboard');
}

// ---- AUTH ----
function toggleAuth(type) {
  document.getElementById('login-form').classList.toggle('hidden', type !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', type !== 'signup');
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  if (!email || !password) { showError(err, 'Please fill all fields'); return; }
  try {
    const res = await api('/api/auth/login', 'POST', { email, password });
    localStorage.setItem('tf_token', res.token);
    localStorage.setItem('tf_user', JSON.stringify(res.user));
    currentUser = res.user;
    showApp();
  } catch (e) { showError(err, e.message); }
}

async function signup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  const err = document.getElementById('signup-error');
  err.classList.add('hidden');
  if (!name || !email || !password) { showError(err, 'Please fill all fields'); return; }
  try {
    const res = await api('/api/auth/signup', 'POST', { name, email, password, role });
    localStorage.setItem('tf_token', res.token);
    localStorage.setItem('tf_user', JSON.stringify(res.user));
    currentUser = res.user;
    showApp();
  } catch (e) { showError(err, e.message); }
}

async function logout() {
  await api('/api/auth/logout', 'POST').catch(() => {});
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  currentUser = null;
  location.reload();
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ---- NAVIGATION ----
function showPage(page, extra) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.remove('hidden');
  
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  
  const titles = { dashboard: 'Dashboard', projects: 'Projects', 'project-detail': 'Project', tasks: 'My Tasks', team: 'Team' };
  document.getElementById('page-title').textContent = titles[page] || page;
  
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = '';

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  if (page === 'dashboard') loadDashboard();
  else if (page === 'projects') loadProjects();
  else if (page === 'project-detail' && extra) loadProjectDetail(extra);
  else if (page === 'tasks') loadMyTasks();
  else if (page === 'team') loadTeam();

  if (page === 'projects' && currentUser.role === 'admin') {
    actions.innerHTML = `<button class="btn-primary btn-sm" onclick="openCreateProject()"><i class="fa-solid fa-plus"></i> New Project</button>`;
  }
  if (page === 'team' && currentUser.role === 'admin') {
    actions.innerHTML = `<span class="badge" style="color:var(--text2);background:var(--bg3)">Admin View</span>`;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ---- DASHBOARD ----
async function loadDashboard() {
  try {
    const [stats, tasks, projects] = await Promise.all([
      api('/api/tasks/stats'),
      api('/api/tasks/my'),
      api('/api/projects')
    ]);
    allTasks = tasks;
    allProjects = projects;
    renderStats(stats);
    renderRecentTasks(tasks.slice(0, 6));
    renderProjectsOverview(projects.slice(0, 5));
  } catch (e) { console.error(e); }
}

function renderStats(s) {
  const statsData = [
    { icon: 'fa-list-check', label: 'Total Tasks', value: s.total_tasks, color: 'col-purple' },
    { icon: 'fa-circle', label: 'To Do', value: s.todo, color: 'col-blue' },
    { icon: 'fa-rotate', label: 'In Progress', value: s.in_progress, color: 'col-orange' },
    { icon: 'fa-check-circle', label: 'Done', value: s.done, color: 'col-green' },
    { icon: 'fa-triangle-exclamation', label: 'Overdue', value: s.overdue, color: 'col-red' },
    { icon: 'fa-folder-open', label: 'Projects', value: s.total_projects, color: 'col-purple' },
    ...(currentUser.role === 'admin' ? [{ icon: 'fa-users', label: 'Members', value: s.total_members, color: 'col-green' }] : [])
  ];
  document.getElementById('stats-grid').innerHTML = statsData.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * 0.06}s">
      <div class="stat-icon ${s.color}"><i class="fa-solid ${s.icon}"></i></div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

function renderRecentTasks(tasks) {
  document.getElementById('task-badge').textContent = allTasks.length;
  if (!tasks.length) {
    document.getElementById('recent-tasks').innerHTML = `<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>No tasks yet</p></div>`;
    return;
  }
  document.getElementById('recent-tasks').innerHTML = tasks.map(t => `
    <div class="task-item" onclick="showPage('tasks')">
      <span class="status-badge status-${t.status}">${statusLabel(t.status)}</span>
      <div class="task-item-info">
        <div class="task-item-title">${escHtml(t.title)}</div>
        <div class="task-item-meta">
          <span class="priority-${t.priority}">${t.priority}</span>
          ${t.project_name ? `<span style="color:var(--text3)"><i class="fa-solid fa-folder"></i> ${escHtml(t.project_name)}</span>` : ''}
          ${t.deadline ? `<span style="color:${isOverdue(t) ? 'var(--red)' : 'var(--text3)'}"><i class="fa-solid fa-calendar"></i> ${formatDate(t.deadline)}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderProjectsOverview(projects) {
  if (!projects.length) {
    document.getElementById('projects-overview').innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder"></i><p>No projects yet</p></div>`;
    return;
  }
  document.getElementById('projects-overview').innerHTML = projects.map(p => {
    const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
    return `
      <div class="proj-list-item" onclick="showPage('project-detail', ${p.id})">
        <div class="proj-dot" style="background:${p.color}"></div>
        <div class="proj-list-info">
          <div class="proj-list-name">${escHtml(p.name)}</div>
          <div class="proj-list-bar"><div class="proj-list-fill" style="background:${p.color};width:${pct}%"></div></div>
        </div>
        <span style="font-size:12px;color:var(--text2)">${pct}%</span>
      </div>
    `;
  }).join('');
}

// ---- PROJECTS ----
async function loadProjects() {
  try {
    const projects = await api('/api/projects');
    allProjects = projects;
    if (!projects.length) {
      document.getElementById('projects-list').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-folder-open"></i><p>No projects yet</p>${currentUser.role === 'admin' ? `<button class="btn-primary" onclick="openCreateProject()"><i class="fa-solid fa-plus"></i> Create Project</button>` : ''}</div>`;
      return;
    }
    document.getElementById('projects-list').innerHTML = projects.map((p, i) => {
      const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
      return `
        <div class="proj-card" style="animation-delay:${i * 0.05}s" onclick="showPage('project-detail', ${p.id})">
          <div class="proj-card-top" style="background:${p.color}"></div>
          <div class="proj-card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span class="status-badge status-${p.status}">${p.status}</span>
              ${p.deadline ? `<span style="font-size:11px;color:var(--text3)"><i class="fa-solid fa-calendar"></i> ${formatDate(p.deadline)}</span>` : ''}
            </div>
            <div class="proj-card-title">${escHtml(p.name)}</div>
            <div class="proj-card-desc">${escHtml(p.description || 'No description')}</div>
            <div class="proj-progress">
              <div class="proj-progress-label">
                <span>${p.done_count}/${p.task_count} tasks done</span>
                <span>${pct}%</span>
              </div>
              <div class="proj-progress-bar"><div class="proj-progress-fill" style="background:${p.color};width:${pct}%"></div></div>
            </div>
            <div class="proj-meta">
              <span><i class="fa-solid fa-users"></i> ${p.member_count} members</span>
              <span><i class="fa-solid fa-list-check"></i> ${p.task_count} tasks</span>
              <span><i class="fa-solid fa-user"></i> ${escHtml(p.creator_name)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) { console.error(e); }
}

// ---- PROJECT DETAIL ----
async function loadProjectDetail(projectId) {
  try {
    const [project, tasks] = await Promise.all([
      api(`/api/projects/${projectId}`),
      api(`/api/tasks/project/${projectId}`)
    ]);
    
    document.getElementById('page-title').textContent = project.name;
    const actions = document.getElementById('topbar-actions');
    actions.innerHTML = '';
    
    if (currentUser.role === 'admin') {
      actions.innerHTML = `
        <button class="btn-primary btn-sm" onclick="openCreateTask(${projectId})"><i class="fa-solid fa-plus"></i> Add Task</button>
        <button class="btn-secondary btn-sm" onclick="openEditProject(${JSON.stringify(project).replace(/"/g,'&quot;')})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-danger btn-sm" onclick="deleteProject(${projectId})"><i class="fa-solid fa-trash"></i></button>
      `;
    }

    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    document.getElementById('project-detail-content').innerHTML = `
      <div class="back-btn" onclick="showPage('projects')"><i class="fa-solid fa-chevron-left"></i> Back to Projects</div>
      <div class="proj-detail-header">
        <div class="proj-detail-color" style="background:${project.color}"><i class="fa-solid fa-folder-open"></i></div>
        <div class="proj-detail-info">
          <h2>${escHtml(project.name)}</h2>
          <p>${escHtml(project.description || 'No description')}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--text2)">
            <span><i class="fa-solid fa-user"></i> ${escHtml(project.creator_name)}</span>
            ${project.deadline ? `<span><i class="fa-solid fa-calendar"></i> Deadline: ${formatDate(project.deadline)}</span>` : ''}
            <span class="status-badge status-${project.status}">${project.status}</span>
          </div>
        </div>
      </div>

      <div class="kanban">
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span class="kanban-col-title" style="color:var(--text2)">📋 To Do</span>
            <span class="kanban-col-count">${todoTasks.length}</span>
          </div>
          <div class="kanban-cards">${todoTasks.map(t => taskCardHTML(t, project.id)).join('') || emptyKanban()}</div>
        </div>
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span class="kanban-col-title" style="color:var(--orange)">🔄 In Progress</span>
            <span class="kanban-col-count">${inProgressTasks.length}</span>
          </div>
          <div class="kanban-cards">${inProgressTasks.map(t => taskCardHTML(t, project.id)).join('') || emptyKanban()}</div>
        </div>
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span class="kanban-col-title" style="color:var(--green)">✅ Done</span>
            <span class="kanban-col-count">${doneTasks.length}</span>
          </div>
          <div class="kanban-cards">${doneTasks.map(t => taskCardHTML(t, project.id)).join('') || emptyKanban()}</div>
        </div>
      </div>

      <div class="members-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <h3>Team Members (${project.members.length})</h3>
          ${currentUser.role === 'admin' ? `<button class="btn-secondary btn-sm" onclick="openAddMember(${projectId})"><i class="fa-solid fa-user-plus"></i> Add Member</button>` : ''}
        </div>
        <div class="member-list">
          ${project.members.map(m => `
            <div class="member-chip">
              <div class="avatar" style="background:${m.avatar_color}">${m.name[0].toUpperCase()}</div>
              <span>${escHtml(m.name)}</span>
              <span class="status-badge status-${m.role === 'admin' ? 'active' : 'todo'}" style="font-size:10px">${m.role}</span>
              ${currentUser.role === 'admin' && m.id !== currentUser.id ? `<button onclick="removeMember(${projectId},${m.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:2px"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) { console.error(e); }
}

function emptyKanban() {
  return `<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No tasks here</div>`;
}

function taskCardHTML(t, projectId) {
  const od = isOverdue(t);
  return `
    <div class="task-card" onclick="openTaskDetail(${JSON.stringify(t).replace(/"/g,'&quot;')}, ${projectId})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div class="task-card-title">${escHtml(t.title)}</div>
        <span class="priority-${t.priority}" style="flex-shrink:0">${t.priority}</span>
      </div>
      <div class="task-card-meta">
        <div class="task-card-assignee">
          ${t.assignee_name ? `<div class="avatar" style="background:${t.assignee_color||'#6366f1'}">${t.assignee_name[0].toUpperCase()}</div><span>${escHtml(t.assignee_name)}</span>` : '<span style="color:var(--text3)">Unassigned</span>'}
        </div>
        ${t.deadline ? `<div class="task-deadline ${od ? 'overdue' : ''}"><i class="fa-solid fa-calendar-days"></i>${formatDate(t.deadline)}${od ? ' ⚠' : ''}</div>` : ''}
      </div>
    </div>
  `;
}

// ---- MY TASKS ----
async function loadMyTasks() {
  try {
    const tasks = await api('/api/tasks/my');
    allTasks = tasks;
    renderTaskCards(tasks);
  } catch (e) { console.error(e); }
}

function renderTaskCards(tasks) {
  if (!tasks.length) {
    document.getElementById('tasks-list').innerHTML = `<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>No tasks found</p></div>`;
    return;
  }
  document.getElementById('tasks-list').innerHTML = tasks.map(t => `
    <div class="task-full-card" onclick="openTaskDetail(${JSON.stringify(t).replace(/"/g,'&quot;')}, null)">
      <div class="status-badge status-${t.status}" style="flex-shrink:0">${statusLabel(t.status)}</div>
      <div class="task-full-card-info">
        <div class="task-full-card-title">${escHtml(t.title)}</div>
        <div class="task-full-card-meta">
          <span class="priority-${t.priority}">${t.priority}</span>
          ${t.project_name ? `<span class="proj-tag" style="background:${t.project_color}22;color:${t.project_color}">${escHtml(t.project_name)}</span>` : ''}
          ${t.deadline ? `<span style="font-size:12px;color:${isOverdue(t) ? 'var(--red)' : 'var(--text3)'}"><i class="fa-solid fa-calendar"></i> ${formatDate(t.deadline)}</span>` : ''}
        </div>
      </div>
      <div style="flex-shrink:0;display:flex;gap:8px">
        ${t.assigned_to === currentUser.id ? `<button class="btn-secondary btn-sm" onclick="event.stopPropagation();quickStatusChange(${t.id}, '${t.status}')"><i class="fa-solid fa-rotate"></i> Update</button>` : ''}
      </div>
    </div>
  `).join('');
}

function filterTasks(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  let filtered = allTasks;
  if (filter === 'overdue') filtered = allTasks.filter(t => isOverdue(t));
  else if (filter !== 'all') filtered = allTasks.filter(t => t.status === filter);
  renderTaskCards(filtered);
}

function quickStatusChange(taskId, current) {
  const next = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
  const newStatus = next[current];
  api(`/api/tasks/${taskId}`, 'PUT', { status: newStatus })
    .then(() => { showToast(`Status → ${statusLabel(newStatus)}`, 'success'); loadMyTasks(); })
    .catch(e => showToast(e.message, 'error'));
}

// ---- TEAM ----
async function loadTeam() {
  try {
    const users = await api('/api/users');
    document.getElementById('team-list').innerHTML = users.map(u => `
      <div class="team-card">
        <div class="avatar lg" style="background:${u.avatar_color}">${u.name[0].toUpperCase()}</div>
        <div class="team-card-name">${escHtml(u.name)}</div>
        <div class="team-card-email">${escHtml(u.email)}</div>
        <span class="status-badge ${u.role === 'admin' ? 'status-active' : 'status-todo'}">${u.role}</span>
        ${u.id !== currentUser.id ? `<div class="team-card-actions"><button class="btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Remove</button></div>` : `<div class="team-card-actions"><span style="font-size:12px;color:var(--text3)">You</span></div>`}
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

async function deleteUser(id) {
  if (!confirm('Remove this user?')) return;
  try {
    await api(`/api/users/${id}`, 'DELETE');
    showToast('User removed', 'success');
    loadTeam();
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- MODALS ----
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay') || e.currentTarget?.classList?.contains('modal-close')) {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
}

// ---- CREATE PROJECT ----
function openCreateProject() {
  openModal('New Project', `
    <div class="form-group"><label>Project Name *</label><input type="text" id="new-proj-name" placeholder="e.g. Website Redesign" /></div>
    <div class="form-group"><label>Description</label><textarea id="new-proj-desc" placeholder="What is this project about?"></textarea></div>
    <div class="form-group"><label>Deadline</label><input type="date" id="new-proj-deadline" /></div>
    <div class="form-group"><label>Color</label><input type="color" id="new-proj-color" value="#7c6ff7" style="height:40px;width:60px;border-radius:8px;border:none;cursor:pointer;background:none;" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="createProject()"><i class="fa-solid fa-check"></i> Create Project</button>
    </div>
  `);
}

async function createProject() {
  const name = document.getElementById('new-proj-name').value.trim();
  const description = document.getElementById('new-proj-desc').value.trim();
  const deadline = document.getElementById('new-proj-deadline').value;
  const color = document.getElementById('new-proj-color').value;
  if (!name) { showToast('Project name required', 'error'); return; }
  try {
    await api('/api/projects', 'POST', { name, description, color, deadline: deadline || null });
    closeModal();
    showToast('Project created!', 'success');
    loadProjects();
  } catch (e) { showToast(e.message, 'error'); }
}

function openEditProject(project) {
  openModal('Edit Project', `
    <div class="form-group"><label>Project Name *</label><input type="text" id="edit-proj-name" value="${escHtml(project.name)}" /></div>
    <div class="form-group"><label>Description</label><textarea id="edit-proj-desc">${escHtml(project.description || '')}</textarea></div>
    <div class="form-group"><label>Status</label>
      <select id="edit-proj-status">
        <option value="active" ${project.status==='active'?'selected':''}>Active</option>
        <option value="completed" ${project.status==='completed'?'selected':''}>Completed</option>
        <option value="archived" ${project.status==='archived'?'selected':''}>Archived</option>
      </select>
    </div>
    <div class="form-group"><label>Deadline</label><input type="date" id="edit-proj-deadline" value="${project.deadline||''}" /></div>
    <div class="form-group"><label>Color</label><input type="color" id="edit-proj-color" value="${project.color||'#7c6ff7'}" style="height:40px;width:60px;border-radius:8px;border:none;cursor:pointer;background:none;" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateProject(${project.id})"><i class="fa-solid fa-check"></i> Save Changes</button>
    </div>
  `);
}

async function updateProject(id) {
  const data = {
    name: document.getElementById('edit-proj-name').value.trim(),
    description: document.getElementById('edit-proj-desc').value.trim(),
    status: document.getElementById('edit-proj-status').value,
    deadline: document.getElementById('edit-proj-deadline').value || null,
    color: document.getElementById('edit-proj-color').value,
  };
  if (!data.name) { showToast('Name required', 'error'); return; }
  try {
    await api(`/api/projects/${id}`, 'PUT', data);
    closeModal();
    showToast('Project updated!', 'success');
    loadProjectDetail(id);
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteProject(id) {
  if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
  try {
    await api(`/api/projects/${id}`, 'DELETE');
    showToast('Project deleted', 'success');
    showPage('projects');
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- CREATE TASK ----
async function openCreateTask(projectId) {
  const users = await api('/api/users').catch(() => []);
  openModal('New Task', `
    <div class="form-group"><label>Title *</label><input type="text" id="new-task-title" placeholder="Task title" /></div>
    <div class="form-group"><label>Description</label><textarea id="new-task-desc" placeholder="Details..."></textarea></div>
    <div class="form-group"><label>Priority</label>
      <select id="new-task-priority">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div class="form-group"><label>Assign To</label>
      <select id="new-task-assignee">
        <option value="">Unassigned</option>
        ${users.map(u => `<option value="${u.id}">${escHtml(u.name)} (${u.role})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Deadline</label><input type="date" id="new-task-deadline" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="createTask(${projectId})"><i class="fa-solid fa-check"></i> Create Task</button>
    </div>
  `);
}

async function createTask(projectId) {
  const title = document.getElementById('new-task-title').value.trim();
  const description = document.getElementById('new-task-desc').value.trim();
  const priority = document.getElementById('new-task-priority').value;
  const assigned_to = document.getElementById('new-task-assignee').value || null;
  const deadline = document.getElementById('new-task-deadline').value || null;
  if (!title) { showToast('Title required', 'error'); return; }
  try {
    await api('/api/tasks', 'POST', { title, description, priority, assigned_to, deadline, project_id: projectId });
    closeModal();
    showToast('Task created!', 'success');
    loadProjectDetail(projectId);
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- TASK DETAIL / EDIT ----
async function openTaskDetail(task, projectId) {
  const isAdmin = currentUser.role === 'admin';
  const isAssignee = task.assigned_to === currentUser.id;
  
  let usersHtml = '';
  if (isAdmin) {
    const users = await api('/api/users').catch(() => []);
    usersHtml = `<div class="form-group"><label>Assign To</label>
      <select id="detail-task-assignee">
        <option value="">Unassigned</option>
        ${users.map(u => `<option value="${u.id}" ${u.id==task.assigned_to?'selected':''}>${escHtml(u.name)}</option>`).join('')}
      </select>
    </div>`;
  }

  openModal(task.title, `
    ${isAdmin ? `<div class="form-group"><label>Title</label><input type="text" id="detail-task-title" value="${escHtml(task.title)}" /></div>` : `<h4 style="margin-bottom:12px">${escHtml(task.title)}</h4>`}
    ${task.description ? `<div class="form-group"><label>Description</label><p style="font-size:13px;color:var(--text2);margin-bottom:8px">${escHtml(task.description)}</p></div>` : ''}
    <div class="form-group"><label>Status</label>
      <select id="detail-task-status">
        <option value="todo" ${task.status==='todo'?'selected':''}>To Do</option>
        <option value="in_progress" ${task.status==='in_progress'?'selected':''}>In Progress</option>
        <option value="done" ${task.status==='done'?'selected':''}>Done</option>
      </select>
    </div>
    ${isAdmin ? `<div class="form-group"><label>Priority</label>
      <select id="detail-task-priority">
        <option value="low" ${task.priority==='low'?'selected':''}>Low</option>
        <option value="medium" ${task.priority==='medium'?'selected':''}>Medium</option>
        <option value="high" ${task.priority==='high'?'selected':''}>High</option>
      </select>
    </div>` : `<p style="font-size:13px;color:var(--text2)">Priority: <span class="priority-${task.priority}">${task.priority}</span></p>`}
    ${usersHtml}
    ${isAdmin ? `<div class="form-group"><label>Deadline</label><input type="date" id="detail-task-deadline" value="${task.deadline||''}" /></div>` : (task.deadline ? `<p style="font-size:13px;color:var(--text2);margin-top:8px"><i class="fa-solid fa-calendar"></i> Deadline: ${formatDate(task.deadline)}</p>` : '')}
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      ${isAdmin ? `<button class="btn-danger" onclick="deleteTask(${task.id}, ${projectId})"><i class="fa-solid fa-trash"></i></button>` : ''}
      ${(isAdmin || isAssignee) ? `<button class="btn-primary" onclick="updateTask(${task.id}, ${projectId})"><i class="fa-solid fa-check"></i> Save</button>` : ''}
    </div>
  `);
}

async function updateTask(taskId, projectId) {
  const isAdmin = currentUser.role === 'admin';
  const data = { status: document.getElementById('detail-task-status').value };
  if (isAdmin) {
    data.title = document.getElementById('detail-task-title').value.trim();
    data.priority = document.getElementById('detail-task-priority').value;
    data.assigned_to = document.getElementById('detail-task-assignee').value || null;
    data.deadline = document.getElementById('detail-task-deadline').value || null;
  }
  try {
    await api(`/api/tasks/${taskId}`, 'PUT', data);
    closeModal();
    showToast('Task updated!', 'success');
    if (projectId) loadProjectDetail(projectId);
    else loadMyTasks();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteTask(taskId, projectId) {
  if (!confirm('Delete this task?')) return;
  try {
    await api(`/api/tasks/${taskId}`, 'DELETE');
    closeModal();
    showToast('Task deleted', 'success');
    if (projectId) loadProjectDetail(projectId);
    else loadMyTasks();
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- ADD MEMBER ----
async function openAddMember(projectId) {
  const [allUsers, project] = await Promise.all([api('/api/users'), api(`/api/projects/${projectId}`)]);
  const memberIds = project.members.map(m => m.id);
  const available = allUsers.filter(u => !memberIds.includes(u.id));
  if (!available.length) { showToast('All users are already members', 'error'); return; }
  openModal('Add Member', `
    <div class="form-group"><label>Select User</label>
      <select id="new-member-id">
        ${available.map(u => `<option value="${u.id}">${escHtml(u.name)} (${u.role})</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addMember(${projectId})"><i class="fa-solid fa-user-plus"></i> Add</button>
    </div>
  `);
}

async function addMember(projectId) {
  const userId = document.getElementById('new-member-id').value;
  try {
    await api(`/api/projects/${projectId}/members`, 'POST', { user_id: userId });
    closeModal();
    showToast('Member added!', 'success');
    loadProjectDetail(projectId);
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeMember(projectId, userId) {
  if (!confirm('Remove this member from the project?')) return;
  try {
    await api(`/api/projects/${projectId}/members/${userId}`, 'DELETE');
    showToast('Member removed', 'success');
    loadProjectDetail(projectId);
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- UTILS ----
async function api(url, method = 'GET', body = null) {
  const token = localStorage.getItem('tf_token');
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function statusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] || s;
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(task) {
  if (!task.deadline || task.status === 'done') return false;
  return new Date(task.deadline) < new Date();
}

function escHtml(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Keyboard shortcut: Escape closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal({ target: document.getElementById('modal-overlay') });
});
