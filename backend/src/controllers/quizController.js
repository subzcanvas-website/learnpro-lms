const db = require('../config/db');

// GET /quizzes
const getQuizzes = async (req, res) => {
  try {
    const { course_id } = req.query;
    const orgId = req.user.org_id;

    let query = `
      SELECT q.*,
        COUNT(qq.id) as question_count,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = $2) as my_attempts,
        (SELECT passed FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = $2 ORDER BY attempt_number DESC LIMIT 1) as last_passed
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      WHERE q.org_id = $1 AND q.is_published = true
    `;
    const params = [orgId, req.user.id];

    if (course_id) { query += ' AND q.course_id = $3'; params.push(course_id); }
    query += ' GROUP BY q.id ORDER BY q.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

// GET /quizzes/:id
const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: quiz } = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (!quiz.length) return res.status(404).json({ error: 'Quiz not found' });

    const { rows: questions } = await db.query(
      `SELECT id, question_text, question_type, options, points, order_index
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index`,
      [id]
    );

    // Check attempt count
    const { rows: attempts } = await db.query(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2',
      [id, req.user.id]
    );

    const attemptCount = parseInt(attempts[0].count);
    if (attemptCount >= quiz[0].max_attempts) {
      return res.status(403).json({
        error: 'Maximum attempts reached',
        attempts: attemptCount,
        max: quiz[0].max_attempts
      });
    }

    let qs = questions;
    if (quiz[0].shuffle_questions) {
      qs = qs.sort(() => Math.random() - 0.5);
    }

    res.json({ ...quiz[0], questions: qs, current_attempt: attemptCount + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

// POST /quizzes
const createQuiz = async (req, res) => {
  try {
    const { title, description, course_id, time_limit_minutes, pass_percentage, max_attempts, shuffle_questions, questions } = req.body;

    const { rows: quiz } = await db.query(
      `INSERT INTO quizzes (org_id, course_id, created_by, title, description, time_limit_minutes, pass_percentage, max_attempts, shuffle_questions, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) RETURNING *`,
      [req.user.org_id, course_id, req.user.id, title, description, time_limit_minutes, pass_percentage, max_attempts, shuffle_questions]
    );

    if (questions && questions.length) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await db.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answers, points, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [quiz[0].id, q.question_text, q.question_type, JSON.stringify(q.options), JSON.stringify(q.correct_answers), q.points || 1, i]
        );
      }
    }

    res.status(201).json(quiz[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// POST /quizzes/:id/submit
const submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, time_taken_seconds } = req.body;
    const userId = req.user.id;

    const { rows: quiz } = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (!quiz.length) return res.status(404).json({ error: 'Quiz not found' });

    const { rows: questions } = await db.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1',
      [id]
    );

    // Calculate score
    let score = 0;
    let totalPoints = 0;
    const gradedAnswers = {};

    questions.forEach((q) => {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      const correctAnswers = q.correct_answers;

      let isCorrect = false;
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        isCorrect = userAnswer === correctAnswers[0];
      } else if (q.question_type === 'multi_select') {
        const ua = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const ca = [...correctAnswers].sort();
        isCorrect = JSON.stringify(ua) === JSON.stringify(ca);
      }

      if (isCorrect) score += q.points;
      gradedAnswers[q.id] = { user_answer: userAnswer, correct: isCorrect, points: isCorrect ? q.points : 0 };
    });

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = percentage >= quiz[0].pass_percentage;

    // Get attempt number
    const { rows: prevAttempts } = await db.query(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2',
      [id, userId]
    );
    const attemptNum = parseInt(prevAttempts[0].count) + 1;

    const { rows: attempt } = await db.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, attempt_number, answers, score, total_points, passed, submitted_at, time_taken_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8) RETURNING *`,
      [id, userId, attemptNum, JSON.stringify(gradedAnswers), score, totalPoints, passed, time_taken_seconds]
    );

    // Award points
    if (passed) {
      const pts = Math.round(percentage);
      await db.query(
        `INSERT INTO point_transactions (user_id, org_id, points, action_type, reference_id, description)
         VALUES ($1, $2, $3, 'quiz_pass', $4, 'Passed quiz')`,
        [userId, req.user.org_id, pts, id]
      );

      await db.query(
        `INSERT INTO gamification_profiles (user_id, org_id, total_points, last_activity_date)
         VALUES ($1, $2, $3, CURRENT_DATE)
         ON CONFLICT (user_id) DO UPDATE
         SET total_points = gamification_profiles.total_points + $3,
             last_activity_date = CURRENT_DATE,
             updated_at = NOW()`,
        [userId, req.user.org_id, pts]
      );
    }

    res.json({
      attempt: attempt[0],
      score,
      total_points: totalPoints,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      graded_answers: gradedAnswers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Quiz submission failed' });
  }
};

// GET /quizzes/:id/results
const getQuizResults = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT qa.*, u.name as user_name
       FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id
       WHERE qa.quiz_id = $1 ORDER BY qa.submitted_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};


// PUT /quizzes/:id
const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, time_limit_minutes, pass_percentage, max_attempts, shuffle_questions } = req.body;
    const { rows } = await db.query(
      `UPDATE quizzes SET title=$1, description=$2, time_limit_minutes=$3, pass_percentage=$4,
       max_attempts=$5, shuffle_questions=$6 WHERE id=$7 RETURNING *`,
      [title, description, time_limit_minutes, pass_percentage, max_attempts, shuffle_questions, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Quiz not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

// PATCH /quizzes/:id/publish
const publishQuiz = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE quizzes SET is_published = NOT is_published WHERE id=$1 RETURNING id, is_published`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ id: rows[0].id, is_published: rows[0].is_published });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle publish' });
  }
};

module.exports = { getQuizzes, getQuiz, createQuiz, submitQuiz, getQuizResults, updateQuiz, publishQuiz };
