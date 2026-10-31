import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  FRONTEND_ORIGINS: (process.env.FRONTEND_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  DB_HOST: process.env.DATABASE_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DATABASE_PORT || '3306', 10),
  DB_NAME: process.env.DATABASE_NAME || 'aavin_milkflow',
  DB_USER: process.env.DATABASE_USER || 'root',
  DB_PASSWORD: process.env.DATABASE_PASSWORD || '',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'aavin_default_secret_jwt_2026_dev',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'aavin_default_refresh_secret_jwt_2026_dev',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '1d',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '30d',

  AI_PROVIDER: (process.env.AI_PROVIDER || 'own_api') as 'openrouter' | 'own_api' | 'disabled',
  AI_ENABLED: process.env.AI_ENABLED !== 'false',
  AI_FALLBACK_ENABLED: process.env.AI_FALLBACK_ENABLED === 'true',
  AI_FALLBACK_PROVIDER: (process.env.AI_FALLBACK_PROVIDER || 'openrouter') as 'openrouter' | 'own_api',

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',

  OWN_AI_BASE_URL: process.env.OWN_AI_BASE_URL || 'http://106.51.21.4:11434',
  OWN_AI_API_KEY: process.env.OWN_AI_API_KEY || '',
  OWN_AI_MODEL: process.env.OWN_AI_MODEL || 'gemma3:12b',

  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || '90000', 10),
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || '1', 10),
};
