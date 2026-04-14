/**
 * Input validation middleware
 * Validates and sanitizes all incoming request bodies
 */

const sanitize = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const deepSanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = typeof v === 'string' ? sanitize(v) : deepSanitize(v);
  }
  return clean;
};

// Global body sanitizer
const sanitizeBody = (req, res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  next();
};

// Field validators
const validators = {
  phone: (phone) => /^[6-9]\d{9}$/.test(phone),
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  uuid: (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  otp: (otp) => /^\d{6}$/.test(otp),
  slug: (slug) => /^[a-z0-9-]+$/.test(slug),
};

// Route-specific validators
const validate = {
  sendOTP: (req, res, next) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!validators.phone(phone)) return res.status(400).json({ error: 'Invalid phone number (10 digits, starting 6-9)' });
    next();
  },

  verifyOTP: (req, res, next) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
    if (!validators.otp(otp)) return res.status(400).json({ error: 'OTP must be 6 digits' });
    next();
  },

  login: (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (!validators.email(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
    next();
  },

  createCourse: (req, res, next) => {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Course title is required' });
    if (title.length > 255) return res.status(400).json({ error: 'Title too long (max 255 chars)' });
    next();
  },

  createQuiz: (req, res, next) => {
    const { title, time_limit_minutes, pass_percentage, max_attempts } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Quiz title is required' });
    if (time_limit_minutes && (time_limit_minutes < 1 || time_limit_minutes > 180))
      return res.status(400).json({ error: 'Time limit must be 1–180 minutes' });
    if (pass_percentage && (pass_percentage < 1 || pass_percentage > 100))
      return res.status(400).json({ error: 'Pass percentage must be 1–100' });
    if (max_attempts && (max_attempts < 1 || max_attempts > 10))
      return res.status(400).json({ error: 'Max attempts must be 1–10' });
    next();
  },

  createUser: (req, res, next) => {
    const { name, email, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (email && !validators.email(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (phone && !validators.phone(phone)) return res.status(400).json({ error: 'Invalid phone number' });
    next();
  },

  createOrg: (req, res, next) => {
    const { name, slug } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Organization name required' });
    if (!slug?.trim()) return res.status(400).json({ error: 'Slug required' });
    if (!validators.slug(slug)) return res.status(400).json({ error: 'Slug: lowercase letters, numbers, hyphens only' });
    if (slug.length > 50) return res.status(400).json({ error: 'Slug too long' });
    next();
  },

  idParam: (req, res, next) => {
    const { id } = req.params;
    if (id && !validators.uuid(id)) return res.status(400).json({ error: 'Invalid ID format' });
    next();
  },
};

module.exports = { sanitizeBody, validate, validators };
