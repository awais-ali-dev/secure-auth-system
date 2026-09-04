// TOTP (Time-based One-Time Password) 2FA utility.
// Uses the same RFC 6238 standard that Google Authenticator, Authy,
// and Microsoft Authenticator all implement, so any of those apps work.

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Generates a new TOTP secret for a user, plus a scannable QR code
 * (as a data: URL) that can be embedded directly in an <img> tag.
 */
async function generateSecret(userLabel, issuer = 'Internee.pk Secure Auth') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${userLabel})`,
    length: 20,
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  return {
    base32: secret.base32,       // store this (encrypted) against the user
    otpauthUrl: secret.otpauth_url,
    qrCodeDataUrl,               // show this to the user to scan once
  };
}

/**
 * Verifies a 6-digit code the user typed in against their stored secret.
 * `window: 1` allows the code from one step before/after to account for
 * minor clock drift between server and phone.
 */
function verifyToken(base32Secret, token) {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

module.exports = { generateSecret, verifyToken };
