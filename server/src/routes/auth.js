const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { signToken, requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { wrap } = require('../utils/helpers');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});
const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

const avatarFor = (name) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

router.post(
  '/signup',
  authLimiter,
  validate(signupSchema),
  wrap(async (req, res) => {
    const { name, email, password } = req.body;
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, avatar: avatarFor(name) });
    res.status(201).json({ token: signToken(user._id), user: user.toPublic() });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  wrap(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect' });
    res.json({ token: signToken(user._id), user: user.toPublic() });
  })
);

// JWTs are stateless; logout is handled client-side by discarding the token.
// This endpoint exists so the client has one place to hook server-side revocation later.
router.post('/logout', requireAuth, (req, res) => res.json({ ok: true }));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

module.exports = router;
