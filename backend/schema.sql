-- =============================================
-- SUBZCANVAS LMS PLATFORM — FULL DATABASE SCHEMA
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ORGANIZATIONS (Multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  plan VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROLES
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system roles
INSERT INTO roles (id, name, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', '{"all": true}'),
  ('00000000-0000-0000-0000-000000000002', 'org_admin', '{"manage_org": true, "manage_users": true, "manage_content": true}'),
  ('00000000-0000-0000-0000-000000000003', 'manager', '{"view_reports": true, "manage_staff": true}'),
  ('00000000-0000-0000-0000-000000000004', 'trainer', '{"create_content": true, "view_reports": true}'),
  ('00000000-0000-0000-0000-000000000005', 'staff', '{"view_content": true, "take_quiz": true}');

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  department VARCHAR(100),
  employee_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP TABLE
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SOP SYSTEM
-- =============================================

CREATE TABLE sops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'draft',
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sop_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sop_id UUID REFERENCES sops(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  change_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LMS: COURSES, MODULES, LESSONS
-- =============================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(100),
  level VARCHAR(50) DEFAULT 'beginner',
  duration_minutes INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'video', 'text', 'pdf', 'youtube'
  content_url TEXT,
  content_body TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completion_pct FLOAT DEFAULT 0,
  UNIQUE(user_id, course_id)
);

-- =============================================
-- LIVE CLASSES
-- =============================================

CREATE TABLE live_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_link TEXT,
  platform VARCHAR(50) DEFAULT 'zoom',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  is_recorded BOOLEAN DEFAULT false,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE live_class_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  UNIQUE(class_id, user_id)
);

-- =============================================
-- QUIZ SYSTEM
-- =============================================

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER DEFAULT 30,
  pass_percentage FLOAT DEFAULT 60,
  max_attempts INTEGER DEFAULT 3,
  shuffle_questions BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'mcq', -- 'mcq', 'true_false', 'multi_select'
  options JSONB NOT NULL DEFAULT '[]',
  correct_answers JSONB NOT NULL DEFAULT '[]',
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL
);

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  answers JSONB DEFAULT '{}',
  score FLOAT DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INTEGER
);

-- =============================================
-- GAMIFICATION
-- =============================================

CREATE TABLE gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  level_name VARCHAR(50) DEFAULT 'Beginner',
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  condition_type VARCHAR(50), -- 'quiz_pass', 'course_complete', 'streak', 'points'
  condition_value JSONB,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  points INTEGER NOT NULL,
  action_type VARCHAR(100),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CERTIFICATIONS
-- =============================================

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  org_id UUID REFERENCES organizations(id),
  certificate_number VARCHAR(100) UNIQUE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT,
  is_valid BOOLEAN DEFAULT true
);

-- =============================================
-- PERFORMANCE / KPI
-- =============================================

CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_value FLOAT,
  unit VARCHAR(50),
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpi_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  value FLOAT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  period_start DATE,
  period_end DATE,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS & PAYMENTS
-- =============================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly FLOAT NOT NULL,
  price_yearly FLOAT,
  max_users INTEGER,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, features) VALUES
  ('Basic', 'basic', 999, 9999, 25, '["5 courses", "Basic analytics", "Email support"]'),
  ('Pro', 'pro', 2999, 29999, 100, '["Unlimited courses", "Advanced analytics", "Priority support", "Custom branding"]'),
  ('Enterprise', 'enterprise', 7999, 79999, NULL, '["Everything in Pro", "API access", "Dedicated support", "SLA guarantee"]');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount FLOAT NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  gateway VARCHAR(50) DEFAULT 'razorpay',
  gateway_order_id VARCHAR(255),
  gateway_payment_id VARCHAR(255),
  gateway_signature VARCHAR(512),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CRM — LEADS
-- =============================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new', -- 'new','contacted','qualified','converted','lost'
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_courses_org ON courses(org_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_gamification_org ON gamification_profiles(org_id);
CREATE INDEX idx_kpi_entries_user ON kpi_entries(user_id);
CREATE INDEX idx_leads_org ON leads(org_id);

-- =============================================
-- PERFORMANCE INDEXES (added in optimization pass)
-- =============================================

-- Courses: filter by published status (frequent query)
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published, org_id);
CREATE INDEX IF NOT EXISTS idx_courses_category  ON courses(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_level     ON courses(level)    WHERE level IS NOT NULL;

-- Lessons: ordered retrieval per module
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(module_id, order_index);

-- Quiz attempts: user results lookup
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted  ON quiz_attempts(submitted_at DESC) WHERE submitted_at IS NOT NULL;

-- Live classes: upcoming class queries
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_classes(scheduled_at, org_id);

-- Point transactions: leaderboard aggregation
CREATE INDEX IF NOT EXISTS idx_points_user_org ON point_transactions(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_points_action   ON point_transactions(action_type);

-- SOPs: org listing
CREATE INDEX IF NOT EXISTS idx_sops_org_updated ON sops(org_id, updated_at DESC);

-- Certificates: user lookup
CREATE INDEX IF NOT EXISTS idx_certs_user ON certificates(user_id, is_valid);
CREATE INDEX IF NOT EXISTS idx_certs_number ON certificates(certificate_number);

-- Refresh tokens: cleanup old tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- OTP cleanup
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires ON otp_tokens(phone, expires_at) WHERE is_used = false;

-- =============================================
-- CMS SETTINGS
-- =============================================

CREATE TABLE IF NOT EXISTS cms_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  brand_name           VARCHAR(255),
  brand_logo_url       TEXT,
  brand_favicon_url    TEXT,
  primary_color        VARCHAR(20) DEFAULT '#ff7f5c',
  secondary_color      VARCHAR(20) DEFAULT '#1a1a2e',
  accent_color         VARCHAR(20) DEFAULT '#6366f1',
  font_family          VARCHAR(100) DEFAULT 'Inter',
  sidebar_style        VARCHAR(50) DEFAULT 'dark',
  enable_gamification  BOOLEAN DEFAULT true,
  enable_ai            BOOLEAN DEFAULT true,
  enable_certificates  BOOLEAN DEFAULT true,
  enable_live_classes  BOOLEAN DEFAULT true,
  welcome_message      TEXT,
  footer_text          TEXT,
  custom_css           TEXT,
  login_background_url TEXT,
  login_tagline        VARCHAR(255),
  menu_config          JSONB,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM FIELDS
CREATE TABLE IF NOT EXISTS custom_fields (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type    VARCHAR(50) NOT NULL, -- 'user' | 'course' | 'quiz' | 'certificate'
  field_name     VARCHAR(100) NOT NULL,
  field_label    VARCHAR(255) NOT NULL,
  field_type     VARCHAR(50) NOT NULL, -- 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean' | 'url' | 'textarea'
  field_options  JSONB DEFAULT '[]',
  is_required    BOOLEAN DEFAULT false,
  is_visible     BOOLEAN DEFAULT true,
  display_order  INTEGER DEFAULT 0,
  placeholder    VARCHAR(255),
  help_text      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, entity_type, field_name)
);

-- CUSTOM FIELD VALUES
CREATE TABLE IF NOT EXISTS custom_field_values (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_id    UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID NOT NULL,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_id, entity_type, entity_id)
);

-- =============================================
-- ENHANCED GAMIFICATION
-- =============================================

-- CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by     UUID REFERENCES users(id),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  challenge_type VARCHAR(100), -- 'complete_courses' | 'pass_quizzes' | 'login_streak' | 'earn_points' | 'custom'
  target_value   INTEGER DEFAULT 1,
  points_reward  INTEGER DEFAULT 50,
  badge_id       UUID REFERENCES badges(id),
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- USER CHALLENGE PROGRESS
CREATE TABLE IF NOT EXISTS user_challenges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress     INTEGER DEFAULT 0,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- REWARDS SHOP
CREATE TABLE IF NOT EXISTS rewards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  points_cost  INTEGER NOT NULL,
  reward_type  VARCHAR(50) DEFAULT 'voucher', -- 'voucher' | 'badge' | 'certificate' | 'custom'
  reward_value TEXT,
  icon_url     TEXT,
  quantity     INTEGER, -- NULL = unlimited
  redeemed_count INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- USER REWARDS
CREATE TABLE IF NOT EXISTS user_rewards (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_id  UUID REFERENCES rewards(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

-- =============================================
-- PERFORMANCE INDEXES FOR NEW TABLES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_cms_settings_org ON cms_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_entity ON custom_fields(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_challenges_org ON challenges(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_org ON rewards(org_id, is_active);
