const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// POST /auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const otp = process.env.MOCK_OTP === 'true'
      ? process.env.MOCK_OTP_VALUE || '123456'
      : generateOTP();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
    await db.query('UPDATE otp_tokens SET is_used = true WHERE phone = $1', [phone]);

    await db.query(
      'INSERT INTO otp_tokens (phone, otp, expires_at) VALUES ($1, $2, $3)',
      [phone, otp, expiresAt]
    );

    // In production, send via SMS/WhatsApp API
    console.log(`📱 OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      ...(process.env.MOCK_OTP === 'true' && { debug_otp: otp }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// POST /auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const { rows } = await db.query(
      `SELECT * FROM otp_tokens
       WHERE phone = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.query('UPDATE otp_tokens SET is_used = true WHERE id = $1', [rows[0].id]);

    // Get or create user
    let userResult = await db.query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.phone = $1`,
      [phone]
    );

    let user;
    if (!userResult.rows.length) {
      const staffRoleId = '00000000-0000-0000-0000-000000000005';
      const newUser = await db.query(
        `INSERT INTO users (phone, role_id, name) VALUES ($1, $2, $3) RETURNING *`,
        [phone, staffRoleId, `User_${phone.slice(-4)}`]
      );
      user = { ...newUser.rows[0], role_name: 'staff' };
    } else {
      user = userResult.rows[0];
    }

    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
        org_id: user.org_id,
        avatar_url: user.avatar_url,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /auth/login
const loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await db.query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
        org_id: user.org_id,
        avatar_url: user.avatar_url,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /auth/refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid refresh token' });

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);

    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [decoded.userId, newRefresh]
    );

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = { sendOTP, verifyOTP, loginWithEmail, refreshToken, logout };
