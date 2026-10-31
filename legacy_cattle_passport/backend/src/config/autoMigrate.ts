import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { env } from './env.js';

export async function autoInitializeDatabase(): Promise<boolean> {
  let rootConnection: mysql.Connection | null = null;
  try {
    // 1. Connect to MySQL server root (without specifying database name first)
    rootConnection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      multipleStatements: true,
    });

    console.log(`[Database Auto-Init] Connected to MySQL host ${env.DB_HOST}:${env.DB_PORT}. Checking database '${env.DB_NAME}'...`);

    // 2. Ensure database exists
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );

    // 3. Switch to database
    await rootConnection.query(`USE \`${env.DB_NAME}\`;`);

    // Check if tables already exist
    const [tables] = await rootConnection.query<any[]>(`SHOW TABLES;`);
    if (tables.length === 0) {
      console.log(`[Database Auto-Init] Database '${env.DB_NAME}' is empty. Running schema.sql migration...`);

      // Find schema.sql
      const schemaCandidates = [
        path.resolve(process.cwd(), 'database/schema.sql'),
        path.resolve(process.cwd(), '../database/schema.sql'),
        path.resolve(__dirname, '../../database/schema.sql'),
        path.resolve(__dirname, '../../../database/schema.sql'),
      ];
      const schemaPath = schemaCandidates.find((p) => fs.existsSync(p));
      if (schemaPath) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await rootConnection.query(schemaSql);
        console.log(`[Database Auto-Init] ✅ schema.sql executed successfully from ${schemaPath}.`);
      }

      // Find seed.sql
      const seedCandidates = [
        path.resolve(process.cwd(), 'database/seed.sql'),
        path.resolve(process.cwd(), '../database/seed.sql'),
        path.resolve(__dirname, '../../database/seed.sql'),
        path.resolve(__dirname, '../../../database/seed.sql'),
      ];
      const seedPath = seedCandidates.find((p) => fs.existsSync(p));
      if (seedPath) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await rootConnection.query(seedSql);
        console.log(`[Database Auto-Init] ✅ seed.sql populated with demo accounts & cattle data from ${seedPath}.`);
      }
    } else {
      console.log(`[Database Auto-Init] Database '${env.DB_NAME}' contains ${tables.length} tables. Schema is ready.`);
    }

    await rootConnection.end();
    return true;
  } catch (error: any) {
    console.error(`[Database Auto-Init] Could not auto-initialize database:`, error.message);
    if (rootConnection) {
      try { await rootConnection.end(); } catch {}
    }
    return false;
  }
}
