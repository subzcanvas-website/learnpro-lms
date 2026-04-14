const db = require('../config/db');

// ── GET /cms/settings ─────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM cms_settings WHERE org_id = $1',
      [req.user.org_id]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CMS settings' });
  }
};

// ── PUT /cms/settings ─────────────────────────────────────────────────────
const updateSettings = async (req, res) => {
  try {
    const {
      brand_name, brand_logo_url, brand_favicon_url,
      primary_color, secondary_color, accent_color,
      font_family, sidebar_style, enable_gamification,
      enable_ai, enable_certificates, enable_live_classes,
      welcome_message, footer_text, custom_css,
      login_background_url, login_tagline,
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO cms_settings (
         org_id, brand_name, brand_logo_url, brand_favicon_url,
         primary_color, secondary_color, accent_color, font_family,
         sidebar_style, enable_gamification, enable_ai,
         enable_certificates, enable_live_classes,
         welcome_message, footer_text, custom_css,
         login_background_url, login_tagline, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
       ON CONFLICT (org_id) DO UPDATE SET
         brand_name          = EXCLUDED.brand_name,
         brand_logo_url      = EXCLUDED.brand_logo_url,
         brand_favicon_url   = EXCLUDED.brand_favicon_url,
         primary_color       = EXCLUDED.primary_color,
         secondary_color     = EXCLUDED.secondary_color,
         accent_color        = EXCLUDED.accent_color,
         font_family         = EXCLUDED.font_family,
         sidebar_style       = EXCLUDED.sidebar_style,
         enable_gamification = EXCLUDED.enable_gamification,
         enable_ai           = EXCLUDED.enable_ai,
         enable_certificates = EXCLUDED.enable_certificates,
         enable_live_classes = EXCLUDED.enable_live_classes,
         welcome_message     = EXCLUDED.welcome_message,
         footer_text         = EXCLUDED.footer_text,
         custom_css          = EXCLUDED.custom_css,
         login_background_url= EXCLUDED.login_background_url,
         login_tagline       = EXCLUDED.login_tagline,
         updated_at          = NOW()
       RETURNING *`,
      [req.user.org_id, brand_name, brand_logo_url, brand_favicon_url,
       primary_color, secondary_color, accent_color, font_family,
       sidebar_style, enable_gamification, enable_ai,
       enable_certificates, enable_live_classes,
       welcome_message, footer_text, custom_css,
       login_background_url, login_tagline]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update CMS settings' });
  }
};

// ── GET /cms/fields ───────────────────────────────────────────────────────
const getCustomFields = async (req, res) => {
  try {
    const { entity_type } = req.query; // 'user' | 'course' | 'quiz' | 'certificate'
    let query = 'SELECT * FROM custom_fields WHERE org_id = $1';
    const params = [req.user.org_id];
    if (entity_type) { query += ' AND entity_type = $2'; params.push(entity_type); }
    query += ' ORDER BY display_order ASC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
};

// ── POST /cms/fields ──────────────────────────────────────────────────────
const createCustomField = async (req, res) => {
  try {
    const {
      entity_type, field_name, field_label, field_type,
      field_options, is_required, is_visible, display_order, placeholder, help_text,
    } = req.body;

    if (!entity_type || !field_name || !field_label || !field_type) {
      return res.status(400).json({ error: 'entity_type, field_name, field_label, field_type required' });
    }

    const { rows } = await db.query(
      `INSERT INTO custom_fields
         (org_id, entity_type, field_name, field_label, field_type,
          field_options, is_required, is_visible, display_order, placeholder, help_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.org_id, entity_type, field_name, field_label, field_type,
       JSON.stringify(field_options || []), is_required || false,
       is_visible !== false, display_order || 0, placeholder, help_text]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Field name already exists for this entity type' });
    res.status(500).json({ error: 'Failed to create custom field' });
  }
};

// ── PUT /cms/fields/:id ───────────────────────────────────────────────────
const updateCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    const { field_label, field_options, is_required, is_visible, display_order, placeholder, help_text } = req.body;
    const { rows } = await db.query(
      `UPDATE custom_fields SET
         field_label = $1, field_options = $2, is_required = $3,
         is_visible = $4, display_order = $5, placeholder = $6, help_text = $7
       WHERE id = $8 AND org_id = $9 RETURNING *`,
      [field_label, JSON.stringify(field_options || []), is_required,
       is_visible, display_order, placeholder, help_text, id, req.user.org_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Field not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update custom field' });
  }
};

// ── DELETE /cms/fields/:id ────────────────────────────────────────────────
const deleteCustomField = async (req, res) => {
  try {
    await db.query('DELETE FROM custom_fields WHERE id=$1 AND org_id=$2', [req.params.id, req.user.org_id]);
    res.json({ message: 'Field deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete field' });
  }
};

// ── GET/POST /cms/field-values ────────────────────────────────────────────
const getFieldValues = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    const { rows } = await db.query(
      `SELECT cfv.*, cf.field_label, cf.field_type, cf.field_name
       FROM custom_field_values cfv
       JOIN custom_fields cf ON cfv.field_id = cf.id
       WHERE cfv.entity_type = $1 AND cfv.entity_id = $2`,
      [entity_type, entity_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch field values' });
  }
};

const saveFieldValues = async (req, res) => {
  try {
    const { entity_type, entity_id, values } = req.body;
    // values = { field_id: value, ... }
    for (const [field_id, value] of Object.entries(values)) {
      await db.query(
        `INSERT INTO custom_field_values (field_id, entity_type, entity_id, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (field_id, entity_type, entity_id) DO UPDATE SET value = $4`,
        [field_id, entity_type, entity_id, String(value)]
      );
    }
    res.json({ message: 'Values saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save field values' });
  }
};

// ── GET /cms/menu ─────────────────────────────────────────────────────────
const getMenuConfig = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT menu_config FROM cms_settings WHERE org_id = $1',
      [req.user.org_id]
    );
    const config = rows[0]?.menu_config || null;
    res.json(config || getDefaultMenu());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu config' });
  }
};

const saveMenuConfig = async (req, res) => {
  try {
    const { menu_config } = req.body;
    await db.query(
      `INSERT INTO cms_settings (org_id, menu_config) VALUES ($1, $2)
       ON CONFLICT (org_id) DO UPDATE SET menu_config = $2, updated_at = NOW()`,
      [req.user.org_id, JSON.stringify(menu_config)]
    );
    res.json({ message: 'Menu saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save menu config' });
  }
};

function getDefaultMenu() {
  return [
    { id: 'dashboard',    label: 'Dashboard',       icon: 'LayoutDashboard', visible: true,  order: 1 },
    { id: 'courses',      label: 'Courses',          icon: 'BookOpen',        visible: true,  order: 2 },
    { id: 'ai-builder',   label: 'AI Builder',       icon: 'Sparkles',        visible: true,  order: 3 },
    { id: 'sops',         label: 'SOPs',             icon: 'FileText',        visible: true,  order: 4 },
    { id: 'quiz',         label: 'Quizzes',          icon: 'Zap',             visible: true,  order: 5 },
    { id: 'live-classes', label: 'Live Classes',     icon: 'Video',           visible: true,  order: 6 },
    { id: 'certificates', label: 'Certificates',     icon: 'Award',           visible: true,  order: 7 },
    { id: 'gamification', label: 'Gamification',     icon: 'Trophy',          visible: true,  order: 8 },
    { id: 'leaderboard',  label: 'Leaderboard',      icon: 'BarChart2',       visible: true,  order: 9 },
    { id: 'kpi',          label: 'KPI',              icon: 'TrendingUp',      visible: true,  order: 10 },
    { id: 'crm',          label: 'CRM',              icon: 'MessageSquare',   visible: true,  order: 11 },
    { id: 'admin',        label: 'Team',             icon: 'Users',           visible: true,  order: 12 },
    { id: 'subscription', label: 'Subscription',     icon: 'CreditCard',      visible: true,  order: 13 },
  ];
}

module.exports = {
  getSettings, updateSettings,
  getCustomFields, createCustomField, updateCustomField, deleteCustomField,
  getFieldValues, saveFieldValues,
  getMenuConfig, saveMenuConfig,
};
