/**
 * Role-Based Access Control Middleware
 * Usage: requireRole('doctor') or requireRole('doctor', 'insurer')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}`,
      yourRole: req.user?.role || 'unknown',
    });
  }
  next();
};

export default requireRole;
