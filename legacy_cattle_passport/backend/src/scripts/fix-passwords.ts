import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

async function updatePasswords() {
  const hash = await bcrypt.hash('Password@123', 10);
  console.log('Generated valid bcrypt hash for Password@123:', hash);
  const isMatch = await bcrypt.compare('Password@123', hash);
  console.log('Verification test:', isMatch);

  const [result] = await db.query('UPDATE users SET password_hash = ?', [hash]);
  console.log('Updated users table successfully:', result);
  process.exit(0);
}

updatePasswords().catch(console.error);
