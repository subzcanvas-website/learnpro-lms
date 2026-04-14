'use strict';
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeBody } = require('./middleware/validate');
const routes    = require('./routes');

const app = express();
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // handled by Next.js frontend
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Body parsing + sanitization ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiterOpts = { standardHeaders: true, legacyHeaders: false };

app.use('/api/auth/send-otp', rateLimit({
  ...limiterOpts, windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many OTP requests. Try again in 15 min.' },
}));

app.use('/api/auth', rateLimit({
  ...limiterOpts, windowMs: 15 * 60 * 1000, max: 30,
  message: { error: 'Too many auth requests.' },
}));

app.use('/api', rateLimit({
  ...limiterOpts, windowMs: 60 * 1000, max: 300,
  message: { error: 'Rate limit exceeded.' },
}));

// ── Request logger ────────────────────────────────────────────────────────────
if (process.env.LOG_REQUESTS === 'true') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await require('./config/db').query('SELECT 1');
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      db: 'connected',
      env: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const isProd  = process.env.NODE_ENV === 'production';
  if (status >= 500) console.error('[ERROR]', err.stack);
  res.status(status).json({
    error: isProd && status >= 500 ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
const server = app.listen(PORT, () => {
  console.log(`\n🚀 LearnPro API → http://localhost:${PORT}`);
  console.log(`   Mode:    ${process.env.NODE_ENV || 'development'}`);
  console.log(`   OTP:     ${process.env.MOCK_OTP === 'true' ? 'MOCK (123456)' : 'Real SMS'}`);
  console.log(`   DB:      ${process.env.DATABASE_URL ? 'configured' : '⚠ DATABASE_URL not set!'}\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (sig) => {
  console.log(`\n${sig} — shutting down...`);
  server.close(async () => {
    await require('./config/db').pool.end();
    console.log('DB pool closed. Exiting.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException',  (e) => { console.error('[uncaughtException]', e); process.exit(1); });

module.exports = app;
