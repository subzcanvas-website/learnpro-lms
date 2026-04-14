#!/usr/bin/env node
/**
 * SEED SCRIPT — creates demo org, users, courses, quizzes, badges
 * Run: node seed.js
 * Requires: DATABASE_URL in environment or .env file
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Seeding database...\n');

  try {
    await client.query('BEGIN');

    // 1. Organization
    console.log('📦 Creating demo organization...');
    const { rows: [org] } = await client.query(`
      INSERT INTO organizations (name, slug, plan)
      VALUES ('Demo Company', 'demo-company', 'pro')
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING *
    `);

    // 2. Users (admin + manager + trainer + 3 staff)
    console.log('👥 Creating demo users...');
    const adminHash = await bcrypt.hash('admin123', 12);
    const staffHash = await bcrypt.hash('staff123', 12);

    const usersToCreate = [
      { name: 'Admin User', email: 'admin@demo.com', role_id: '00000000-0000-0000-0000-000000000002', hash: adminHash, dept: 'Management' },
      { name: 'Sarah Manager', email: 'manager@demo.com', role_id: '00000000-0000-0000-0000-000000000003', hash: adminHash, dept: 'Operations' },
      { name: 'Alex Trainer', email: 'trainer@demo.com', role_id: '00000000-0000-0000-0000-000000000004', hash: adminHash, dept: 'L&D' },
      { name: 'Priya Singh', email: 'priya@demo.com', role_id: '00000000-0000-0000-0000-000000000005', hash: staffHash, dept: 'Sales' },
      { name: 'Rahul Verma', email: 'rahul@demo.com', role_id: '00000000-0000-0000-0000-000000000005', hash: staffHash, dept: 'Tech' },
      { name: 'Anita Sharma', email: 'anita@demo.com', role_id: '00000000-0000-0000-0000-000000000005', hash: staffHash, dept: 'HR' },
    ];

    const createdUsers = [];
    for (const u of usersToCreate) {
      const { rows: [user] } = await client.query(`
        INSERT INTO users (org_id, name, email, password_hash, role_id, department, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *
      `, [org.id, u.name, u.email, u.hash, u.role_id, u.dept]);
      createdUsers.push(user);

      await client.query(`
        INSERT INTO gamification_profiles (user_id, org_id, total_points, level)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id, org.id, Math.floor(Math.random() * 500)]);
    }

    const [adminUser, , trainerUser, ...staffUsers] = createdUsers;

    // 3. Courses
    console.log('📚 Creating demo courses...');
    const courses = [
      {
        title: 'New Employee Onboarding',
        description: 'Complete guide to getting started at Demo Company. Learn our culture, tools, and processes.',
        category: 'onboarding', level: 'beginner', is_published: true,
        modules: [
          {
            title: 'Company Overview',
            lessons: [
              { title: 'Welcome Message from CEO', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
              { title: 'Our Mission & Values', type: 'text', body: 'Our company is built on three core values: Excellence, Integrity, and Innovation. These guide every decision we make...' },
              { title: 'Org Chart & Team Structure', type: 'text', body: 'Understanding our organizational structure helps you know who to reach for different needs...' },
            ]
          },
          {
            title: 'Tools & Systems',
            lessons: [
              { title: 'Setting Up Your Workstation', type: 'text', body: 'Step-by-step guide to setting up all the tools you need...' },
              { title: 'Communication Guidelines', type: 'text', body: 'How we communicate at Demo Company: Slack for quick messages, email for formal communication...' },
            ]
          }
        ]
      },
      {
        title: 'Customer Service Excellence',
        description: 'Master the art of exceptional customer service. Handle difficult situations with confidence.',
        category: 'soft-skills', level: 'intermediate', is_published: true,
        modules: [
          {
            title: 'Communication Fundamentals',
            lessons: [
              { title: 'Active Listening Techniques', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
              { title: 'Empathy in Customer Interactions', type: 'text', body: 'Empathy is the foundation of great customer service...' },
            ]
          },
          {
            title: 'Handling Difficult Customers',
            lessons: [
              { title: 'De-escalation Framework', type: 'text', body: 'The LEAP framework: Listen, Empathize, Apologize, Propose...' },
              { title: 'Real-world Scenarios', type: 'text', body: 'Practice scenarios for common difficult customer situations...' },
            ]
          }
        ]
      },
      {
        title: 'Data Security & Compliance',
        description: 'Essential security training for all employees. Protect company and customer data.',
        category: 'compliance', level: 'beginner', is_published: true,
        modules: [
          {
            title: 'Security Basics',
            lessons: [
              { title: 'Password Best Practices', type: 'text', body: 'Strong passwords are your first line of defense...' },
              { title: 'Phishing Recognition', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            ]
          }
        ]
      }
    ];

    for (const courseData of courses) {
      const { rows: [course] } = await client.query(`
        INSERT INTO courses (org_id, created_by, title, description, category, level, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING RETURNING *
      `, [org.id, trainerUser.id, courseData.title, courseData.description, courseData.category, courseData.level, courseData.is_published]);

      if (!course) continue;

      for (let mi = 0; mi < courseData.modules.length; mi++) {
        const mod = courseData.modules[mi];
        const { rows: [module] } = await client.query(`
          INSERT INTO modules (course_id, title, order_index) VALUES ($1, $2, $3) RETURNING *
        `, [course.id, mod.title, mi]);

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          await client.query(`
            INSERT INTO lessons (module_id, title, content_type, content_url, content_body, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [module.id, lesson.title, lesson.type, lesson.url || null, lesson.body || null, li]);
        }

        // Enroll staff users
        for (const staffUser of staffUsers) {
          await client.query(`
            INSERT INTO course_enrollments (user_id, course_id, completion_pct)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `, [staffUser.id, course.id, Math.floor(Math.random() * 100)]);
        }
      }
    }

    // 4. Quizzes
    console.log('🧠 Creating demo quizzes...');
    const { rows: [quiz] } = await client.query(`
      INSERT INTO quizzes (org_id, created_by, title, description, time_limit_minutes, pass_percentage, max_attempts, is_published)
      VALUES ($1, $2, 'Data Security Assessment', 'Test your knowledge of security best practices', 15, 70, 3, true)
      RETURNING *
    `, [org.id, trainerUser.id]);

    const questions = [
      { q: 'What is the minimum recommended password length?', opts: ['6 characters', '8 characters', '12 characters', '16 characters'], ans: '12 characters' },
      { q: 'Which of these is a sign of a phishing email?', opts: ['Email from your boss', 'Urgent request to click a link', 'Newsletter you subscribed to', 'Invoice from a known vendor'], ans: 'Urgent request to click a link' },
      { q: 'What should you do if you suspect a security breach?', opts: ['Ignore it', 'Fix it yourself', 'Report to IT immediately', 'Tell your colleagues'], ans: 'Report to IT immediately' },
      { q: 'How often should you update your passwords?', opts: ['Never', 'Every 5 years', 'Every 90 days or when compromised', 'Only when asked'], ans: 'Every 90 days or when compromised' },
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await client.query(`
        INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answers, points, order_index)
        VALUES ($1, $2, 'mcq', $3, $4, 1, $5)
      `, [quiz.id, q.q, JSON.stringify(q.opts), JSON.stringify([q.ans]), i]);
    }

    // 5. Badges
    console.log('🏅 Creating badges...');
    const badges = [
      { name: 'First Login', description: 'Logged in for the first time', icon_url: '🎉', condition_type: 'first_login', points_reward: 10 },
      { name: 'Course Completer', description: 'Completed your first course', icon_url: '📚', condition_type: 'course_complete', points_reward: 100 },
      { name: 'Quiz Master', description: 'Passed 5 quizzes', icon_url: '🎯', condition_type: 'quiz_pass', points_reward: 50 },
      { name: 'Top Performer', description: 'Reached top 3 on leaderboard', icon_url: '🏆', condition_type: 'leaderboard_top3', points_reward: 200 },
      { name: '7-Day Streak', description: 'Logged in 7 days in a row', icon_url: '🔥', condition_type: 'streak', points_reward: 70 },
      { name: 'SOP Champion', description: 'Completed 10 SOPs', icon_url: '📋', condition_type: 'sop_complete', points_reward: 80 },
    ];

    for (const badge of badges) {
      await client.query(`
        INSERT INTO badges (org_id, name, description, icon_url, condition_type, points_reward)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [org.id, badge.name, badge.description, badge.icon_url, badge.condition_type, badge.points_reward]);
    }

    // 6. KPIs
    console.log('📊 Creating sample KPIs...');
    const kpis = [
      { name: 'Course Completion Rate', unit: '%', target: 85, category: 'Learning' },
      { name: 'Quiz Pass Rate', unit: '%', target: 75, category: 'Assessment' },
      { name: 'Customer Satisfaction Score', unit: 'pts', target: 4.5, category: 'Performance' },
      { name: 'Monthly Sales Target', unit: '₹', target: 100000, category: 'Sales' },
    ];

    for (const kpi of kpis) {
      await client.query(`
        INSERT INTO kpis (org_id, name, unit, target_value, category)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [org.id, kpi.name, kpi.unit, kpi.target, kpi.category]);
    }

    // 7. Sample leads
    console.log('💼 Creating CRM leads...');
    const leads = [
      { name: 'Vikram Malhotra', email: 'vikram@startup.in', phone: '9876543210', source: 'LinkedIn', status: 'new' },
      { name: 'Deepa Nair', email: 'deepa@corp.com', phone: '9845678901', source: 'Website', status: 'contacted' },
      { name: 'Arun Kumar', email: 'arun@enterprise.co', phone: '9123456789', source: 'Referral', status: 'qualified' },
    ];

    for (const lead of leads) {
      await client.query(`
        INSERT INTO leads (org_id, name, email, phone, source, status, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [org.id, lead.name, lead.email, lead.phone, lead.source, lead.status, adminUser.id]);
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin:    admin@demo.com   / admin123');
    console.log('  Manager:  manager@demo.com / admin123');
    console.log('  Trainer:  trainer@demo.com / admin123');
    console.log('  Staff:    priya@demo.com   / staff123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  OTP login: any phone + OTP 123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
