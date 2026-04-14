const db = require('../config/db');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ─── Razorpay SDK helper (lazy-load so mock mode doesn't require keys) ─────────
function getRazorpay() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
      && !process.env.RAZORPAY_KEY_ID.includes('xxxxxxxxxx')) {
    const Razorpay = require('razorpay');
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return null;
}

// POST /subscriptions/order
const createOrder = async (req, res) => {
  try {
    const { plan_id, billing_cycle } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

    const { rows: plan } = await db.query(
      'SELECT * FROM subscription_plans WHERE id=$1 AND is_active=true',
      [plan_id]
    );
    if (!plan.length) return res.status(404).json({ error: 'Plan not found' });

    const amount = billing_cycle === 'yearly'
      ? (plan[0].price_yearly || plan[0].price_monthly * 10)
      : plan[0].price_monthly;

    const razorpay = getRazorpay();
    let orderId;
    let orderAmount = Math.round(amount * 100); // paise

    if (razorpay) {
      // Real Razorpay order
      const order = await razorpay.orders.create({
        amount: orderAmount,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          plan_id,
          billing_cycle,
          org_id: req.user.org_id,
        },
      });
      orderId = order.id;
    } else {
      // Mock order
      orderId = `order_mock_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    }

    // Save pending payment record
    const { rows: payment } = await db.query(
      `INSERT INTO payments (org_id, amount, currency, status, gateway, gateway_order_id)
       VALUES ($1, $2, 'INR', 'pending', 'razorpay', $3) RETURNING *`,
      [req.user.org_id, amount, orderId]
    );

    res.json({
      order: { id: orderId, amount: orderAmount, currency: 'INR' },
      payment_id: payment[0].id,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      is_mock: !razorpay,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// POST /subscriptions/verify
const verifyPayment = async (req, res) => {
  try {
    const {
      payment_id: dbPaymentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan_id,
      billing_cycle,
    } = req.body;

    const razorpay = getRazorpay();

    if (razorpay && razorpay_signature) {
      // Real signature verification
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }
    // In mock mode, skip signature check

    // Mark payment as paid
    await db.query(
      `UPDATE payments
       SET status='paid', gateway_payment_id=$1, gateway_signature=$2, paid_at=NOW()
       WHERE id=$3`,
      [razorpay_payment_id || `pay_mock_${Date.now()}`, razorpay_signature || 'mock', dbPaymentId]
    );

    // Deactivate old subscriptions
    await db.query(
      `UPDATE subscriptions SET status='cancelled' WHERE org_id=$1 AND status='active'`,
      [req.user.org_id]
    );

    // Create new subscription
    const expiresAt = billing_cycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { rows: sub } = await db.query(
      `INSERT INTO subscriptions (org_id, plan_id, status, billing_cycle, expires_at, auto_renew)
       VALUES ($1, $2, 'active', $3, $4, true) RETURNING *`,
      [req.user.org_id, plan_id, billing_cycle, expiresAt]
    );

    // Update org plan
    const { rows: plan } = await db.query(
      'SELECT slug FROM subscription_plans WHERE id=$1',
      [plan_id]
    );
    if (plan.length) {
      await db.query(
        'UPDATE organizations SET plan=$1 WHERE id=$2',
        [plan[0].slug, req.user.org_id]
      );
    }

    res.json({
      message: 'Payment verified. Subscription activated!',
      subscription: sub[0],
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// GET /plans
const getPlans = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM subscription_plans WHERE is_active=true ORDER BY price_monthly'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// GET /subscriptions/current
const getCurrentSubscription = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, sp.name as plan_name, sp.features, sp.max_users, sp.price_monthly, sp.price_yearly
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.org_id=$1 AND s.status='active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.org_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// GET /payments/history
const getPaymentHistory = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, sp.name as plan_name
       FROM payments p
       LEFT JOIN subscriptions s ON s.org_id = p.org_id
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE p.org_id=$1 ORDER BY p.created_at DESC LIMIT 20`,
      [req.user.org_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

module.exports = { createOrder, verifyPayment, getPlans, getCurrentSubscription, getPaymentHistory };
