const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ==================== LIVE CLASSES ====================

const getLiveClasses = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const { rows } = await db.query(
      `SELECT lc.*, u.name as created_by_name,
         COUNT(DISTINCT la.id) as attendee_count
       FROM live_classes lc
       LEFT JOIN users u ON lc.created_by = u.id
       LEFT JOIN live_class_attendance la ON lc.id = la.class_id
       WHERE lc.org_id = $1
       GROUP BY lc.id, u.name
       ORDER BY lc.scheduled_at DESC`,
      [orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live classes' });
  }
};

const createLiveClass = async (req, res) => {
  try {
    const { title, description, meeting_link, platform, scheduled_at, duration_minutes, course_id } = req.body;
    const { rows } = await db.query(
      `INSERT INTO live_classes (org_id, course_id, created_by, title, description, meeting_link, platform, scheduled_at, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.org_id, course_id || null, req.user.id, title, description, meeting_link, platform || 'zoom', scheduled_at, duration_minutes || 60]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `INSERT INTO live_class_attendance (class_id, user_id, attended, joined_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (class_id, user_id) DO UPDATE SET attended=true, joined_at=NOW()`,
      [id, req.user.id]
    );

    // Award points for attending
    await db.query(
      `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
       VALUES ($1, $2, 20, 'live_class_attend', $3, 'Attended live class')`,
      [req.user.id, req.user.org_id, id]
    );

    res.json({ message: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

// ==================== MODULES ====================

const createModule = async (req, res) => {
  try {
    const { course_id, title, description, order_index } = req.body;
    const { rows } = await db.query(
      `INSERT INTO modules (course_id, title, description, order_index)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [course_id, title, description, order_index || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create module' });
  }
};

const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;
    const { rows } = await db.query(
      'UPDATE modules SET title=$1, description=$2, order_index=$3 WHERE id=$4 RETURNING *',
      [title, description, order_index, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module' });
  }
};

const deleteModule = async (req, res) => {
  try {
    await db.query('DELETE FROM modules WHERE id=$1', [req.params.id]);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
};

// ==================== LESSONS ====================

const createLesson = async (req, res) => {
  try {
    const { module_id, title, content_type, content_url, content_body, duration_minutes, order_index, is_mandatory } = req.body;
    const { rows } = await db.query(
      `INSERT INTO lessons (module_id, title, content_type, content_url, content_body, duration_minutes, order_index, is_mandatory)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [module_id, title, content_type || 'text', content_url, content_body, duration_minutes || 0, order_index || 0, is_mandatory !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content_type, content_url, content_body, duration_minutes, order_index } = req.body;
    const { rows } = await db.query(
      `UPDATE lessons SET title=$1, content_type=$2, content_url=$3, content_body=$4,
       duration_minutes=$5, order_index=$6 WHERE id=$7 RETURNING *`,
      [title, content_type, content_url, content_body, duration_minutes, order_index, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

const deleteLesson = async (req, res) => {
  try {
    await db.query('DELETE FROM lessons WHERE id=$1', [req.params.id]);
    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};

// ==================== CERTIFICATES ====================

const getCertificates = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cert.*, c.title as course_title, u.name as user_name, o.name as org_name
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       JOIN users u ON cert.user_id = u.id
       LEFT JOIN organizations o ON cert.org_id = o.id
       WHERE cert.user_id = $1 AND cert.is_valid = true
       ORDER BY cert.issued_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

const issueCertificate = async (req, res) => {
  try {
    const { user_id, course_id } = req.body;

    // Check course completion
    const { rows: enrollment } = await db.query(
      'SELECT * FROM course_enrollments WHERE user_id=$1 AND course_id=$2 AND completion_pct=100',
      [user_id, course_id]
    );
    if (!enrollment.length) {
      return res.status(400).json({ error: 'Course not completed' });
    }

    // Check if cert already issued
    const { rows: existing } = await db.query(
      'SELECT id FROM certificates WHERE user_id=$1 AND course_id=$2',
      [user_id, course_id]
    );
    if (existing.length) {
      return res.json({ message: 'Certificate already issued', id: existing[0].id });
    }

    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { rows } = await db.query(
      `INSERT INTO certificates (user_id, course_id, org_id, certificate_number)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, course_id, req.user.org_id, certNumber]
    );

    // Award badge/points for certification
    await db.query(
      `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
       VALUES ($1, $2, 200, 'certificate_earned', $3, 'Earned certificate')`,
      [user_id, req.user.org_id, course_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
};

const verifyCertificate = async (req, res) => {
  try {
    const { number } = req.params;
    const { rows } = await db.query(
      `SELECT cert.*, c.title as course_title, u.name as user_name, o.name as org_name
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       JOIN users u ON cert.user_id = u.id
       LEFT JOIN organizations o ON cert.org_id = o.id
       WHERE cert.certificate_number = $1`,
      [number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ valid: rows[0].is_valid, certificate: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

module.exports = {
  getLiveClasses, createLiveClass, markAttendance,
  createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
  getCertificates, issueCertificate, verifyCertificate,
};
