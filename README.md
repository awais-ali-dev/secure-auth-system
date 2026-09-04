# Secure User Authentication System

A working authentication system built for Internee.pk, implementing:

- ✅ **OAuth 2.0** sign-in via Google (using Passport.js)
- ✅ **Two-Factor Authentication (2FA)** via TOTP — compatible with Google Authenticator, Authy, etc.
- ✅ **AES-256-GCM encryption** for sensitive user data (email, phone, national ID) at rest

---

## Architecture

```
├── server.js                # Express app entry point
├── config/passport.js       # Google OAuth 2.0 strategy
├── routes/auth.js           # OAuth + 2FA routes
├── models/db.js             # SQLite schema (staging user DB)
├── utils/encryption.js      # AES-256-GCM encrypt/decrypt
├── utils/twoFactor.js       # TOTP secret generation + verification
├── views/                   # EJS templates (login, dashboard, 2FA setup/verify)
├── seed-from-mockaroo.js    # Import fake Mockaroo users, encrypted on the way in
└── .env.example             # Required environment variables
```

## How authentication flows

1. **Sign in with Google** → user is redirected to Google's OAuth 2.0 consent screen. We never see or store their Google password — only the profile info (name, email) they consent to share.
2. **First-time users** are created in the local `users` table; their email is encrypted with AES-256-GCM before it touches the database.
3. **If 2FA is enabled** on the account, the user is redirected to `/2fa/verify` and must enter a 6-digit code from Google Authenticator before reaching the dashboard.
4. **Enabling 2FA**: from the dashboard, a user can visit `/2fa/setup`, scan a QR code with Google Authenticator, and confirm with a live code. Only after a valid code is entered is the TOTP secret persisted (encrypted) — this prevents lockouts from a bad QR scan.

## Why these specific choices

- **OAuth 2.0 (not a custom password system):** avoids ever storing or handling user passwords directly, offloading credential security to Google's infrastructure.
- **TOTP (RFC 6238) for 2FA:** an open standard — works with any authenticator app, not locked into a single vendor.
- **AES-256-GCM (not CBC):** GCM provides authenticated encryption — it detects if ciphertext has been tampered with, not just confidentiality.

---

## Setup

### Requirements
- **Node.js 22.5 or newer** (uses Node's built-in `node:sqlite` module — no native database driver, no C++ build tools like Visual Studio Build Tools or Xcode CLI tools required)

### 1. Install dependencies
```bash
npm install
```

### 2. Get Google OAuth 2.0 credentials
1. Go to the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Application type: **Web application**)
3. Add an authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy the generated **Client ID** and **Client Secret**

### 3. Configure environment variables
```bash
cp .env.example .env
```
Then fill in `.env`:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 2
- `AES_ENCRYPTION_KEY` — generate a 32-byte key with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `SESSION_SECRET` — any long random string

### 4. Run the server
```bash
npm start
```
Visit `http://localhost:3000`.

---

## Seeding fake staging data with Mockaroo

1. Go to [mockaroo.com](https://www.mockaroo.com/)
2. Create a schema with fields: `name` (Full Name), `email` (Email Address), `phone` (Phone), `national_id` (Custom List or SSN)
3. Download as **CSV**, save it to `data/mockaroo-users.csv`
4. Run:
   ```bash
   node seed-from-mockaroo.js
   ```
   This encrypts every sensitive field with AES-256 before inserting it into the database — nothing sensitive is ever written to disk in plaintext.

---

## Security notes / limitations

- This is a **staging/demo** build, not hardened for production. Before production use: enforce HTTPS (`cookie.secure = true`), add rate limiting on `/2fa/verify`, and add CSRF protection on forms.
- The AES-256 key and session secret must be kept out of version control — `.env` is gitignored; only `.env.example` (with placeholders) is committed.
- 2FA secrets are encrypted at rest, same as other sensitive fields — a database leak alone isn't enough to generate valid codes.
