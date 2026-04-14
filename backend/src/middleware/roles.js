const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const userRole = req.user.role_name;
    const permissions = req.user.permissions || {};

    // Super admin bypasses all role checks
    if (userRole === 'super_admin' || permissions.all) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
    }

    next();
  };
};

const requireOrgMatch = (req, res, next) => {
  const userRole = req.user.role_name;
  if (userRole === 'super_admin') return next();

  const orgId = req.params.orgId || req.body.org_id || req.query.org_id;
  if (orgId && orgId !== req.user.org_id) {
    return res.status(403).json({ error: 'Cross-organization access denied' });
  }
  next();
};

module.exports = { requireRole, requireOrgMatch };
