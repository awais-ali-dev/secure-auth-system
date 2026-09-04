require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const { decrypt } = require('./utils/encryption');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 }, // set secure:true behind HTTPS in production
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);

app.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('index');
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  const email = decrypt(req.user.email_encrypted);
  res.render('dashboard', { user: req.user, email });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure auth server running on http://localhost:${PORT}`));
