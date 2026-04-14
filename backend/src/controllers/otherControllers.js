const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ==================== GAMIFICATION ====================

const getLeaderboard = async (req, res) => {
  try {
    const orgId = req.query.org_id || req.user.org_id;
    const { rows } = await db.query(
      `SELECT gp.*, u.name, u.avatar_url, u.department,
         RANK() OVER (ORDER BY gp.total_points DESC) as rank
       FROM gamification_profiles gp
       JOIN users u ON gp.user_id = u.id
       WHERE gp.org_id = $1
       ORDER BY gp.total_points DESC LIMIT 50`,
      [orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT gp.*,
         RANK() OVER (ORDER BY gp.total_points DESC) as rank,
         (SELECT json_agg(b) FROM (
           SELECT b.name, b.description, b.icon_url, ub.awarded_at
           FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
           WHERE ub.user_id = $1
         ) b) as badges
       FROM gamification_profiles gp
       WHERE gp.user_id = $1`,
      [req.user.id]
    );

    const profile = rows[0] || { total_points: 0, level: 1, badges: [] };
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const getBadges = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*,
         CASE WHEN ub.user_id IS NOT NULL THEN true ELSE false END as earned
       FROM badges b
       LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
       WHERE b.org_id = $2 OR b.org_id IS NULL`,
      [req.user.id, req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
};

// ==================== SOP SYSTEM ====================

const getSOPs = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name as created_by_name,
         sv.steps, sv.version_number as current_version_data
       FROM sops s
       LEFT JOIN users u ON s.created_by = u.id
       LEFT JOIN sop_versions sv ON s.id = sv.sop_id AND sv.version_number = s.current_version
       WHERE s.org_id = $1 ORDER BY s.updated_at DESC`,
      [req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SOPs' });
  }
};

const getSOP = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: sop } = await db.query('SELECT * FROM sops WHERE id = $1', [id]);
    if (!sop.length) return res.status(404).json({ error: 'SOP not found' });

    const { rows: versions } = await db.query(
      'SELECT * FROM sop_versions WHERE sop_id = $1 ORDER BY version_number DESC',
      [id]
    );

    res.json({ ...sop[0], versions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SOP' });
  }
};

const createSOP = async (req, res) => {
  try {
    const { title, description, category, tags, steps } = req.body;

    const { rows: sop } = await db.query(
      `INSERT INTO sops (org_id, created_by, title, description, category, tags, current_version)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
      [req.user.org_id, req.user.id, title, description, category, tags]
    );

    await db.query(
      `INSERT INTO sop_versions (sop_id, version_number, steps, created_by)
       VALUES ($1, 1, $2, $3)`,
      [sop[0].id, JSON.stringify(steps || []), req.user.id]
    );

    res.status(201).json(sop[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create SOP' });
  }
};

const updateSOP = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, steps, change_notes } = req.body;

    const { rows: current } = await db.query('SELECT * FROM sops WHERE id = $1', [id]);
    if (!current.length) return res.status(404).json({ error: 'SOP not found' });

    const newVersion = current[0].current_version + 1;

    await db.query(
      `INSERT INTO sop_versions (sop_id, version_number, steps, change_notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, newVersion, JSON.stringify(steps), change_notes, req.user.id]
    );

    const { rows } = await db.query(
      `UPDATE sops SET title=$1, description=$2, category=$3, tags=$4,
       current_version=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, description, category, tags, newVersion, id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update SOP' });
  }
};

// ==================== KPI ====================

const getKPIs = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM kpis WHERE org_id = $1 ORDER BY created_at DESC',
      [req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
};

const createKPI = async (req, res) => {
  try {
    const { name, description, target_value, unit, category } = req.body;
    const { rows } = await db.query(
      `INSERT INTO kpis (org_id, name, description, target_value, unit, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.org_id, name, description, target_value, unit, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create KPI' });
  }
};

const addKPIEntry = async (req, res) => {
  try {
    const { kpi_id, user_id, value, rating, notes, period_start, period_end } = req.body;
    const { rows } = await db.query(
      `INSERT INTO kpi_entries (kpi_id, user_id, value, rating, notes, period_start, period_end, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [kpi_id, user_id, value, rating, notes, period_start, period_end, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add KPI entry' });
  }
};

const getKPIScorecard = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { rows } = await db.query(
      `SELECT k.name, k.target_value, k.unit, k.category,
         AVG(ke.value) as avg_value,
         AVG(ke.rating) as avg_rating,
         COUNT(ke.id) as entry_count,
         MAX(ke.recorded_at) as last_updated
       FROM kpis k
       LEFT JOIN kpi_entries ke ON k.id = ke.kpi_id AND ke.user_id = $1
       WHERE k.org_id = $2
       GROUP BY k.id ORDER BY k.category`,
      [user_id, req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get scorecard' });
  }
};

// ==================== SUBSCRIPTIONS ====================

const getPlans = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM subscription_plans WHERE is_active=true ORDER BY price_monthly');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { plan_id, billing_cycle } = req.body;
    const Razorpay = require('razorpay');

    const { rows: plan } = await db.query('SELECT * FROM subscription_plans WHERE id=$1', [plan_id]);
    if (!plan.length) return res.status(404).json({ error: 'Plan not found' });

    const amount = billing_cycle === 'yearly'
      ? plan[0].price_yearly
      : plan[0].price_monthly;

    // Mock Razorpay order
    const mockOrder = {
      id: `order_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      amount: amount * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    // Save payment record
    const { rows: payment } = await db.query(
      `INSERT INTO payments (org_id, amount, currency, status, gateway, gateway_order_id)
       VALUES ($1, $2, 'INR', 'pending', 'razorpay', $3) RETURNING *`,
      [req.user.org_id, amount, mockOrder.id]
    );

    res.json({
      order: mockOrder,
      payment_id: payment[0].id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { payment_id, razorpay_payment_id, razorpay_order_id, plan_id, billing_cycle } = req.body;

    // In production: verify signature with crypto HMAC
    // Mock: assume valid
    await db.query(
      `UPDATE payments SET status='paid', gateway_payment_id=$1, paid_at=NOW()
       WHERE id=$2`,
      [razorpay_payment_id, payment_id]
    );

    const expiresAt = billing_cycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO subscriptions (org_id, plan_id, status, billing_cycle, expires_at)
       VALUES ($1, $2, 'active', $3, $4)
       `,
      [req.user.org_id, plan_id, billing_cycle, expiresAt]
    );

    res.json({ message: 'Payment verified and subscription activated' });
  } catch (err) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// ==================== CRM ====================

const getLeads = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.org_id = $1`;
    const params = [req.user.org_id];
    if (status) { query += ' AND l.status=$2'; params.push(status); }
    query += ' ORDER BY l.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

const createLead = async (req, res) => {
  try {
    const { name, email, phone, source, notes, assigned_to } = req.body;
    const { rows } = await db.query(
      `INSERT INTO leads (org_id, name, email, phone, source, notes, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.org_id, name, email, phone, source, notes, assigned_to]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, source, status, notes, assigned_to } = req.body;
    const { rows } = await db.query(
      `UPDATE leads SET name=$1, email=$2, phone=$3, source=$4, status=$5,
       notes=$6, assigned_to=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, email, phone, source, status, notes, assigned_to, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

module.exports = {
  getLeaderboard, getMyProfile, getBadges,
  getSOPs, getSOP, createSOP, updateSOP,
  getKPIs, createKPI, addKPIEntry, getKPIScorecard,
  getLeads, createLead, updateLead,
};
