import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { env } from './env.js';

const poolConfig: PoolOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00', // Timestamps stored in UTC
  dateStrings: true,
  decimalNumbers: true,
};

export const db: Pool = mysql.createPool(poolConfig);

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL Connection Error:', error);
    return false;
  }
}
