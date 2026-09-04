// Imports a Mockaroo-generated CSV of fake users into the staging DB,
// encrypting sensitive fields (email, phone, national_id) with AES-256
// before they ever touch disk.
//
// 1. Go to https://www.mockaroo.com/
// 2. Create fields: name (Full Name), email (Email Address),
//    phone (Phone), national_id (Custom List / SSN)
// 3. Download as CSV, save it as data/mockaroo-users.csv
// 4. Run: node seed-from-mockaroo.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const db = require('./models/db');
const { encrypt } = require('./utils/encryption');

const csvPath = path.join(__dirname, 'data', 'mockaroo-users.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`No CSV found at ${csvPath}`);
  console.error('Download a dataset from https://www.mockaroo.com/ and save it there first.');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const insert = db.prepare(`
  INSERT INTO users (display_name, email_encrypted, phone_encrypted, national_id_encrypted)
  VALUES (?, ?, ?, ?)
`);

let count = 0;
for (const row of records) {
  insert.run(
    row.name || row.full_name || 'Unknown',
    encrypt(row.email || ''),
    row.phone ? encrypt(row.phone) : null,
    row.national_id ? encrypt(row.national_id) : null
  );
  count++;
}

console.log(`Seeded ${count} fake users from Mockaroo CSV, all sensitive fields AES-256 encrypted.`);
