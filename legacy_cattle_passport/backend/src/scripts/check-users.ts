import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

async function check() {
  const [users] = await db.query<any[]>('SELECT id, username, phone, password_hash FROM users');
  console.log('Total users in DB:', users.length);
  for (const u of users) {
    const isMatch = await bcrypt.compare('Password@123', u.password_hash);
    console.log(`User: ${u.username} (${u.phone}) -> Password match: ${isMatch}`);
  }
  process.exit(0);
}

check().catch(console.error);
