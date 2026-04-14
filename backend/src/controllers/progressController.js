const db = require('../config/db');

const updateProgressWithCert = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { lesson_id, completed, progress_seconds } = req.body;
    const userId = req.user.id;
    const orgId  = req.user.org_id;

    // ── 1. Upsert lesson progress ────────────────────────────────────────────
    await db.query(
      `INSERT INTO lesson_progress
         (user_id, lesson_id, course_id, completed, progress_seconds, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         completed        = EXCLUDED.completed,
         progress_seconds = EXCLUDED.progress_seconds,
         completed_at     = EXCLUDED.completed_at`,
      [userId, lesson_id, courseId, completed,
       progress_seconds || 0, completed ? new Date() : null]
    );

    // ── 2. Compute completion + update enrollment in one CTE ─────────────────
    const { rows: [stat] } = await db.query(
      `WITH counts AS (
         SELECT
           COUNT(DISTINCT l.id)::int                                              AS total,
           COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.completed=true)::int    AS done
         FROM modules m
         JOIN  lessons l  ON l.module_id = m.id
         LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1
         WHERE m.course_id=$2
       ),
       upd AS (
         UPDATE course_enrollments
         SET completion_pct = CASE WHEN c.total>0
                                   THEN ROUND((c.done::numeric/c.total)*100)
                                   ELSE 0 END,
             completed_at   = CASE WHEN c.total>0 AND c.done=c.total THEN NOW() ELSE NULL END
         FROM counts c
         WHERE user_id=$1 AND course_id=$2
         RETURNING completion_pct
       )
       SELECT c.total, c.done, COALESCE(u.completion_pct,0)::int AS pct
       FROM counts c LEFT JOIN upd u ON true`,
      [userId, courseId]
    );

    const pct = stat?.pct ?? 0;

    // ── 3. At 100%: award points + upsert gamification + cert (idempotent) ───
    if (pct === 100) {
      const { rows: already } = await db.query(
        `SELECT 1 FROM point_transactions
         WHERE user_id=$1 AND action_type='course_complete' AND reference_id=$2 LIMIT 1`,
        [userId, courseId]
      );

      if (!already.length) {
        // Points + gamification upsert in single CTE round-trip
        await db.query(
          `WITH pts AS (
             INSERT INTO point_transactions
               (user_id,org_id,points,action_type,reference_id,description)
             VALUES ($1,$2,100,'course_complete',$3,'Completed course')
           )
           INSERT INTO gamification_profiles (user_id,org_id,total_points,last_activity_date)
           VALUES ($1,$2,100,CURRENT_DATE)
           ON CONFLICT (user_id) DO UPDATE SET
             total_points       = gamification_profiles.total_points + 100,
             last_activity_date = CURRENT_DATE,
             updated_at         = NOW()`,
          [userId, orgId, courseId]
        );
      }

      // Certificate — idempotent INSERT
      const { rows: cert } = await db.query(
        `SELECT id FROM certificates WHERE user_id=$1 AND course_id=$2 LIMIT 1`,
        [userId, courseId]
      );
      if (!cert.length) {
        const num = `CERT-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        await db.query(
          `INSERT INTO certificates (user_id,course_id,org_id,certificate_number)
           VALUES ($1,$2,$3,$4)`,
          [userId, courseId, orgId, num]
        );
      }
    }

    res.json({ completion_pct: pct, certificate_issued: pct === 100 });
  } catch (err) {
    console.error('[updateProgress]', err.message);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

module.exports = { updateProgressWithCert };
