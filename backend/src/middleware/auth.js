const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Support Authorization header OR ?token= query (needed for SSE / EventSource)
  const header = req.headers.authorization;
  const raw = header?.startsWith('Bearer ')
    ? header.split(' ')[1]
    : req.query.token;

  if (!raw) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(raw, process.env.JWT_SECRET || 'healthchain_super_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = auth;
