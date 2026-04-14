const db = require('../config/db');

// GET /courses
const getCourses = async (req, res) => {
  try {
    const { org_id, category, level, search } = req.query;
    const orgId = org_id || req.user.org_id;

    let query = `
      SELECT c.*,
        u.name as creator_name,
        COUNT(DISTINCT ce.id) as enrollment_count,
        COUNT(DISTINCT m.id) as module_count,
        COUNT(DISTINCT l.id) as lesson_count
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN lessons l ON m.id = l.module_id
      WHERE c.org_id = $1
    `;
    const params = [orgId];
    let idx = 2;

    if (category) { query += ` AND c.category = $${idx++}`; params.push(category); }
    if (level) { query += ` AND c.level = $${idx++}`; params.push(level); }
    if (search) { query += ` AND (c.title ILIKE $${idx} OR c.description ILIKE $${idx++})`; params.push(`%${search}%`); }

    query += ' GROUP BY c.id, u.name ORDER BY c.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// GET /courses/:id
const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rows: courses } = await db.query(
      `SELECT c.*, u.name as creator_name FROM courses c
       LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1`,
      [id]
    );

    if (!courses.length) return res.status(404).json({ error: 'Course not found' });

    const { rows: modules } = await db.query(
      `SELECT m.*, json_agg(l ORDER BY l.order_index) as lessons
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       WHERE m.course_id = $1
       GROUP BY m.id ORDER BY m.order_index`,
      [id]
    );

    const { rows: enrollment } = await db.query(
      'SELECT * FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, id]
    );

    const { rows: progress } = await db.query(
      'SELECT lesson_id, completed FROM lesson_progress WHERE user_id = $1 AND course_id = $2',
      [userId, id]
    );

    res.json({
      ...courses[0],
      modules,
      enrollment: enrollment[0] || null,
      progress: progress.reduce((acc, p) => ({ ...acc, [p.lesson_id]: p.completed }), {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

// POST /courses
const createCourse = async (req, res) => {
  try {
    const { title, description, thumbnail_url, category, level, tags } = req.body;
    const orgId = req.user.org_id;
    const createdBy = req.user.id;

    const { rows } = await db.query(
      `INSERT INTO courses (org_id, created_by, title, description, thumbnail_url, category, level, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orgId, createdBy, title, description, thumbnail_url, category, level, tags]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// PUT /courses/:id
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail_url, category, level, tags, is_published } = req.body;

    const { rows } = await db.query(
      `UPDATE courses SET title=$1, description=$2, thumbnail_url=$3, category=$4,
       level=$5, tags=$6, is_published=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, description, thumbnail_url, category, level, tags, is_published, id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Course not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course' });
  }
};

// DELETE /courses/:id
const deleteCourse = async (req, res) => {
  try {
    await db.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// POST /courses/:id/enroll
const enrollCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rows } = await db.query(
      `INSERT INTO course_enrollments (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING RETURNING *`,
      [userId, id]
    );

    // Create gamification entry
    await db.query(
      `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
       VALUES ($1, $2, 10, 'course_enroll', $3, 'Enrolled in course')`,
      [userId, req.user.org_id, id]
    );

    res.json({ message: 'Enrolled successfully', enrollment: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Enrollment failed' });
  }
};

// POST /courses/:id/progress
const updateProgress = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { lesson_id, completed, progress_seconds } = req.body;
    const userId = req.user.id;

    await db.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, progress_seconds, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET completed=$4, progress_seconds=$5, completed_at=$6`,
      [userId, lesson_id, courseId, completed, progress_seconds, completed ? new Date() : null]
    );

    // Recalculate course completion %
    const { rows: totals } = await db.query(
      `SELECT
         COUNT(DISTINCT l.id) as total,
         COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.completed=true) as done
       FROM modules m
       JOIN lessons l ON l.module_id = m.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
       WHERE m.course_id = $2`,
      [userId, courseId]
    );

    const pct = totals[0].total > 0
      ? Math.round((totals[0].done / totals[0].total) * 100)
      : 0;

    await db.query(
      `UPDATE course_enrollments SET completion_pct=$1, completed_at=$2
       WHERE user_id=$3 AND course_id=$4`,
      [pct, pct === 100 ? new Date() : null, userId, courseId]
    );

    if (pct === 100) {
      // Award points + trigger certificate
      await db.query(
        `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
         VALUES ($1, $2, 100, 'course_complete', $3, 'Completed course')
         `,
        [userId, req.user.org_id, courseId]
      );
    }

    res.json({ completion_pct: pct });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

module.exports = { getCourses, getCourse, createCourse, updateCourse, deleteCourse, enrollCourse, updateProgress };
