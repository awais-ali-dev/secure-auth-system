const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../models/db');
const { encrypt } = require('../utils/encryption');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  done(null, user);
});

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  (accessToken, refreshToken, profile, done) => {
    // OAuth 2.0 / OpenID Connect flow: Google has already verified the
    // user's identity. We never see or store their Google password —
    // only the profile info they consent to share.
    const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);

    if (existing) {
      return done(null, existing);
    }

    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';

    const info = db.prepare(`
      INSERT INTO users (google_id, display_name, email_encrypted)
      VALUES (?, ?, ?)
    `).run(profile.id, profile.displayName, encrypt(email));

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    return done(null, newUser);
  }
));

module.exports = passport;
