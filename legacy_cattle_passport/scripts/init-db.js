/**
 * Aavin Smart Cattle Passport - Database Initializer
 * Connects to MySQL (XAMPP default: 127.0.0.1:3306, user: root, password: '')
 * Executes schema.sql and seed.sql with progress logging.
 */
const fs = require('fs');
const path = require('path');

// Simple .env parser to avoid external dependencies
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

// Load environment variables from backend/.env if available
const envPath = path.resolve(__dirname, '../backend/.env');
loadEnv(envPath);

// Resolve mysql2 from backend/node_modules or root
let mysql;
try {
  mysql = require(path.resolve(__dirname, '../backend/node_modules/mysql2/promise'));
} catch (_) {
  try {
    mysql = require('mysql2/promise');
  } catch (err) {
    console.error('❌ mysql2 package not found. Please run "npm install" inside backend directory first.');
    process.exit(1);
  }
}

const DB_HOST = process.env.DATABASE_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '3306', 10);
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'aavin_milkflow';

const isReset = process.argv.includes('--reset');

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '========================================================================');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  🐄 AAVIN SMART CATTLE PASSPORT — XAMPP DATABASE SETUP');
  console.log('\x1b[36m%s\x1b[0m', '========================================================================');
  console.log(`  🔌 Connecting to MySQL Server at ${DB_HOST}:${DB_PORT} as '${DB_USER}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });
  } catch (err) {
    console.error('\n\x1b[31m%s\x1b[0m', `❌ Failed to connect to MySQL on ${DB_HOST}:${DB_PORT}`);
    console.error('   Please make sure XAMPP is open and MySQL is started (green status).');
    console.error(`   Error details: ${err.message}\n`);
    process.exit(1);
  }

  console.log('  ✅ MySQL server connection successful.\n');

  try {
    if (isReset) {
      console.log(`  🗑️  Reset mode: Dropping database \`${DB_NAME}\` if exists...`);
      await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\`;`);
      console.log(`  ✅ Database \`${DB_NAME}\` dropped.`);
    }

    console.log(`  📦 Ensuring database \`${DB_NAME}\` exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${DB_NAME}\`;`);
    console.log(`  ✅ Using database \`${DB_NAME}\`.`);

    // Schema import
    const schemaFile = path.resolve(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaFile)) {
      console.log('  📄 Executing schema.sql (creating 40 relational tables)...');
      const schemaSql = fs.readFileSync(schemaFile, 'utf8');
      await connection.query(schemaSql);
      console.log('  ✅ Schema import complete.');
    } else {
      console.warn('  ⚠️ schema.sql file not found at:', schemaFile);
    }

    // Seed import
    const seedFile = path.resolve(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedFile)) {
      console.log('  🌱 Executing seed.sql (populating demo users, cows, treatments, AI config)...');
      const seedSql = fs.readFileSync(seedFile, 'utf8');
      await connection.query(seedSql);
      console.log('  ✅ Seed data import complete.');
    } else {
      console.warn('  ⚠️ seed.sql file not found at:', seedFile);
    }

    // Count tables
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('\n\x1b[32m%s\x1b[0m', `🎉 SUCCESS: Database '${DB_NAME}' initialized with ${tables.length} tables.`);
    console.log('\x1b[36m%s\x1b[0m', '========================================================================\n');
  } catch (err) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Error during database initialization:');
    console.error(err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
