const express = require('express');
const passport = require('passport');
const router = express.Router();

const db = require('../models/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateSecret, verifyToken } = require('../utils/twoFactor');

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// --- Step 1: Kick off Google OAuth 2.0 ---
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// --- Step 2: Google redirects back here after consent ---
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    if (req.user.two_factor_enabled) {
      // 2FA required before granting full access
      req.session.pending2FAUserId = req.user.id;
      return res.redirect('/2fa/verify');
    }
    res.redirect('/dashboard');
  }
);

router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// --- 2FA enrollment (only after the user is already logged in via OAuth) ---
router.get('/2fa/setup', ensureLoggedIn, async (req, res) => {
  const { base32, qrCodeDataUrl } = await generateSecret(req.user.display_name || `user${req.user.id}`);

  // Stash the plaintext secret in session only until the user confirms
  // enrollment with a valid code; only then is it persisted (encrypted).
  req.session.pending2FASecret = base32;

  res.render('2fa-setup', { qrCodeDataUrl });
});

router.post('/2fa/setup', ensureLoggedIn, express.urlencoded({ extended: true }), (req, res) => {
  const { token } = req.body;
  const secret = req.session.pending2FASecret;

  if (!secret || !verifyToken(secret, token)) {
    return res.status(400).send('Invalid code. Please try again.');
  }

  db.prepare(`
    UPDATE users SET two_factor_secret_encrypted = ?, two_factor_enabled = 1 WHERE id = ?
  `).run(encrypt(secret), req.user.id);

  delete req.session.pending2FASecret;
  res.redirect('/dashboard');
});

// --- 2FA verification (during login, after OAuth succeeds) ---
router.get('/2fa/verify', (req, res) => {
  if (!req.session.pending2FAUserId) return res.redirect('/');
  res.render('2fa-verify');
});

router.post('/2fa/verify', express.urlencoded({ extended: true }), (req, res) => {
  const userId = req.session.pending2FAUserId;
  if (!userId) return res.redirect('/');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const secret = decrypt(user.two_factor_secret_encrypted);

  if (!verifyToken(secret, req.body.token)) {
    return res.status(400).send('Invalid 2FA code.');
  }

  delete req.session.pending2FAUserId;
  req.login(user, (err) => {
    if (err) return res.status(500).send('Login error');
    res.redirect('/dashboard');
  });
});

module.exports = router;
