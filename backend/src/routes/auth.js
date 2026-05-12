const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const demoStore = require('../data/demoStore');

const sign = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'healthchain_super_secret',
    { expiresIn: '24h' }
  );

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = demoStore.isMemory()
      ? await demoStore.findUserByEmail(email)
      : await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = demoStore.isMemory()
      ? await demoStore.comparePassword(user, password)
      : await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: sign(user), user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const existing = demoStore.isMemory()
      ? await demoStore.findUserByEmail(email)
      : await User.findOne({ email });

    if (existing)
      return res.status(400).json({ error: 'Email already in use' });

    const user = demoStore.isMemory()
      ? await demoStore.createUser({ email, password, name, role })
      : await User.create({ email, password, name, role });
    res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
