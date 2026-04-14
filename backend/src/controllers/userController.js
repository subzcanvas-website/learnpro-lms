const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /users
const getUsers = async (req, res) => {
  try {
    const orgId = req.query.org_id || req.user.org_id;
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.department,
         u.employee_id, u.is_active, u.last_login, u.created_at,
         r.name as role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.org_id = $1 ORDER BY u.created_at DESC`,
      [orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /users/:id
const getUser = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, r.name as role_name FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...user } = rows[0];
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// POST /users
const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role_id, department, employee_id, org_id } = req.body;
    const orgId = org_id || req.user.org_id;
    const hash = password ? await bcrypt.hash(password, 12) : null;

    const { rows } = await db.query(
      `INSERT INTO users (org_id, name, email, phone, password_hash, role_id, department, employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, phone, department, employee_id, created_at`,
      [orgId, name, email, phone, hash, role_id, department, employee_id]
    );

    // Init gamification profile
    await db.query(
      `INSERT INTO gamification_profiles (user_id, org_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [rows[0].id, orgId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email or phone already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, employee_id, role_id, is_active, avatar_url } = req.body;

    const { rows } = await db.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, department=$4,
       employee_id=$5, role_id=$6, is_active=$7, avatar_url=$8, updated_at=NOW()
       WHERE id=$9 RETURNING id, name, email, phone, department, is_active`,
      [name, email, phone, department, employee_id, role_id, is_active, avatar_url, id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /users/:id
const deleteUser = async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// GET /admin/dashboard
const getAdminDashboard = async (req, res) => {
  try {
    const orgId = req.user.org_id;

    const [users, courses, quizzes, enrollments, points, leads] = await Promise.all([
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM users WHERE org_id=$1', [orgId]),
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_published=true) as published FROM courses WHERE org_id=$1', [orgId]),
      db.query('SELECT COUNT(*) as total FROM quizzes WHERE org_id=$1', [orgId]),
      db.query('SELECT COUNT(*) as total, AVG(completion_pct) as avg_completion FROM course_enrollments ce JOIN courses c ON ce.course_id=c.id WHERE c.org_id=$1', [orgId]),
      db.query('SELECT SUM(points) as total FROM point_transactions WHERE org_id=$1', [orgId]),
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'new\') as new_leads FROM leads WHERE org_id=$1', [orgId]),
    ]);

    const { rows: topLearners } = await db.query(
      `SELECT u.name, u.avatar_url, gp.total_points, gp.level
       FROM gamification_profiles gp JOIN users u ON gp.user_id=u.id
       WHERE gp.org_id=$1 ORDER BY gp.total_points DESC LIMIT 5`,
      [orgId]
    );

    const { rows: recentActivity } = await db.query(
      `SELECT pt.*, u.name as user_name FROM point_transactions pt
       JOIN users u ON pt.user_id=u.id
       WHERE pt.org_id=$1 ORDER BY pt.created_at DESC LIMIT 10`,
      [orgId]
    );

    res.json({
      stats: {
        users: users.rows[0],
        courses: courses.rows[0],
        quizzes: quizzes.rows[0],
        enrollments: enrollments.rows[0],
        points: points.rows[0],
        leads: leads.rows[0],
      },
      top_learners: topLearners,
      recent_activity: recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

// GET /admin/orgs (super admin only)
const getOrganizations = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, COUNT(u.id) as user_count,
         s.status as subscription_status,
         sp.name as plan_name
       FROM organizations o
       LEFT JOIN users u ON u.org_id = o.id
       LEFT JOIN subscriptions s ON s.org_id = o.id AND s.status='active'
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       GROUP BY o.id, s.status, sp.name
       ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

// POST /admin/orgs
const createOrganization = async (req, res) => {
  try {
    const { name, slug, logo_url } = req.body;
    const { rows } = await db.query(
      'INSERT INTO organizations (name, slug, logo_url) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, logo_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, getAdminDashboard, getOrganizations, createOrganization };
