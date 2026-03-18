const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const SECRET = process.env.JWT_SECRET || 'gramsathi-secret-fallback';

function generateToken(userId, role) {
  return jwt.sign({ sub: String(userId), role }, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
function generateRefreshToken(userId) {
  return jwt.sign({ sub: String(userId), type: 'refresh' }, SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'Authentication required' });
  try {
    const payload = verifyToken(auth.slice(7));
    const user = getDb().prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(Number(payload.sub));
    if (!user) return res.status(401).json({ detail: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

function requireRoles(...roles) {
  return [authenticate, (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ detail: `Access denied. Required roles: ${roles.join(', ')}` });
    next();
  }];
}

module.exports = {
  generateToken, generateRefreshToken, verifyToken, authenticate,
  requireMember: requireRoles('member','coordinator','bank_officer','admin'),
  requireCoordinator: requireRoles('coordinator','admin'),
  requireBankOfficer: requireRoles('bank_officer','admin'),
  requireAdmin: requireRoles('admin'),
};
