const db = require('../config/db');

// ── GET /gamification/dashboard ───────────────────────────────────────────
const getGamificationDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId  = req.user.org_id;

    const [profile, badges, challenges, transactions, rank] = await Promise.all([
      db.query('SELECT * FROM gamification_profiles WHERE user_id=$1', [userId]),
      db.query(`
        SELECT b.*, ub.awarded_at
        FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = $1
        ORDER BY ub.awarded_at DESC`, [userId]),
      db.query(`
        SELECT uc.*, c.title, c.description, c.target_value,
               c.points_reward, c.badge_id, c.challenge_type, c.ends_at
        FROM user_challenges uc
        JOIN challenges c ON uc.challenge_id = c.id
        WHERE uc.user_id = $1 AND (c.ends_at IS NULL OR c.ends_at > NOW())
        ORDER BY uc.completed ASC, c.ends_at ASC NULLS LAST
        LIMIT 5`, [userId]),
      db.query(`
        SELECT * FROM point_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 10`, [userId]),
      db.query(`
        SELECT COUNT(*) + 1 AS rank
        FROM gamification_profiles
        WHERE org_id = $1 AND total_points > (
          SELECT COALESCE(total_points, 0) FROM gamification_profiles WHERE user_id = $2
        )`, [orgId, userId]),
    ]);

    const p = profile.rows[0] || { total_points: 0, level: 1, streak_days: 0 };

    // Calculate next level threshold
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];
    const currentLevel    = Math.min(p.level, 10);
    const nextThreshold   = levelThresholds[currentLevel] || levelThresholds[10];
    const prevThreshold   = levelThresholds[currentLevel - 1] || 0;
    const levelProgress   = nextThreshold > prevThreshold
      ? Math.round(((p.total_points - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
      : 100;

    res.json({
      profile:           p,
      rank:              parseInt(rank.rows[0]?.rank || 1),
      earned_badges:     badges.rows,
      active_challenges: challenges.rows,
      recent_activity:   transactions.rows,
      level_progress:    Math.min(levelProgress, 100),
      next_level_points: Math.max(0, nextThreshold - p.total_points),
    });
  } catch (err) {
    console.error('[gamification dashboard]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

// ── GET /gamification/challenges ──────────────────────────────────────────
const getChallenges = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*,
        uc.progress, uc.completed, uc.completed_at,
        CASE WHEN uc.user_id IS NOT NULL THEN true ELSE false END AS enrolled
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
      WHERE c.org_id = $2
        AND c.is_active = true
        AND (c.ends_at IS NULL OR c.ends_at > NOW())
      ORDER BY c.created_at DESC`,
      [req.user.id, req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// ── POST /cms/challenges ──────────────────────────────────────────────────
const createChallenge = async (req, res) => {
  try {
    const {
      title, description, challenge_type, target_value,
      points_reward, badge_id, starts_at, ends_at, is_active = true,
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO challenges
         (org_id, created_by, title, description, challenge_type,
          target_value, points_reward, badge_id, starts_at, ends_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.org_id, req.user.id, title, description, challenge_type,
       target_value, points_reward, badge_id || null, starts_at || null, ends_at || null, is_active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

// ── POST /gamification/challenges/:id/join ────────────────────────────────
const joinChallenge = async (req, res) => {
  try {
    const { rows } = await db.query(
      `INSERT INTO user_challenges (user_id, challenge_id, progress)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, challenge_id) DO NOTHING RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Joined challenge!', record: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join challenge' });
  }
};

// ── GET /gamification/rewards ─────────────────────────────────────────────
const getRewards = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*,
         CASE WHEN ur.user_id IS NOT NULL THEN true ELSE false END AS redeemed
       FROM rewards r
       LEFT JOIN user_rewards ur ON r.id = ur.reward_id AND ur.user_id = $1
       WHERE r.org_id = $2 AND r.is_active = true
       ORDER BY r.points_cost ASC`,
      [req.user.id, req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
};

// ── POST /gamification/rewards/:id/redeem ─────────────────────────────────
const redeemReward = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.user.id;
    const orgId   = req.user.org_id;

    const { rows: reward } = await db.query(
      'SELECT * FROM rewards WHERE id=$1 AND org_id=$2 AND is_active=true', [id, orgId]
    );
    if (!reward.length) return res.status(404).json({ error: 'Reward not found' });

    const { rows: profile } = await db.query(
      'SELECT total_points FROM gamification_profiles WHERE user_id=$1', [userId]
    );
    const points = profile[0]?.total_points || 0;
    if (points < reward[0].points_cost) {
      return res.status(400).json({ error: `Not enough points. Need ${reward[0].points_cost}, have ${points}` });
    }

    // Check already redeemed
    const { rows: already } = await db.query(
      'SELECT id FROM user_rewards WHERE user_id=$1 AND reward_id=$2', [userId, id]
    );
    if (already.length) return res.status(400).json({ error: 'Already redeemed' });

    // Deduct points + record redemption
    await db.query(
      `UPDATE gamification_profiles SET total_points = total_points - $1 WHERE user_id = $2`,
      [reward[0].points_cost, userId]
    );
    await db.query(
      `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
       VALUES ($1,$2,$3,'reward_redeem',$4,$5)`,
      [userId, orgId, -reward[0].points_cost, id, `Redeemed: ${reward[0].title}`]
    );
    await db.query(
      'INSERT INTO user_rewards (user_id, reward_id) VALUES ($1,$2)', [userId, id]
    );

    res.json({ message: `Redeemed "${reward[0].title}"! Check your email for details.` });
  } catch (err) {
    res.status(500).json({ error: 'Redemption failed' });
  }
};

// ── POST /cms/rewards ─────────────────────────────────────────────────────
const createReward = async (req, res) => {
  try {
    const { title, description, points_cost, reward_type, reward_value, quantity, icon_url } = req.body;
    const { rows } = await db.query(
      `INSERT INTO rewards (org_id, title, description, points_cost, reward_type, reward_value, quantity, icon_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.org_id, title, description, points_cost, reward_type || 'badge', reward_value, quantity || null, icon_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reward' });
  }
};

// ── POST /gamification/award-points (admin/system) ────────────────────────
const awardPoints = async (req, res) => {
  try {
    const { user_id, points, reason } = req.body;
    if (!user_id || !points) return res.status(400).json({ error: 'user_id and points required' });

    await db.query(
      `INSERT INTO point_transactions (user_id, org_id, points, action_type, description)
       VALUES ($1,$2,$3,'manual_award',$4)`,
      [user_id, req.user.org_id, points, reason || 'Manual point award']
    );
    await db.query(
      `INSERT INTO gamification_profiles (user_id, org_id, total_points, last_activity_date)
       VALUES ($1,$2,$3,CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET
         total_points = gamification_profiles.total_points + $3,
         last_activity_date = CURRENT_DATE, updated_at = NOW()`,
      [user_id, req.user.org_id, points]
    );
    res.json({ message: `${points} points awarded` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to award points' });
  }
};

// ── POST /cms/badges ──────────────────────────────────────────────────────
const createBadge = async (req, res) => {
  try {
    const { name, description, icon_url, condition_type, condition_value, points_reward } = req.body;
    const { rows } = await db.query(
      `INSERT INTO badges (org_id, name, description, icon_url, condition_type, condition_value, points_reward)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.org_id, name, description, icon_url, condition_type,
       JSON.stringify(condition_value || {}), points_reward || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create badge' });
  }
};

module.exports = {
  getGamificationDashboard, getChallenges, createChallenge, joinChallenge,
  getRewards, redeemReward, createReward, awardPoints, createBadge,
};
