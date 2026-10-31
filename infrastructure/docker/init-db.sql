-- Database initialization for Aavin Aalumai Shift Counter Ledger
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Notice for Append-Only database policy
COMMENT ON DATABASE aavin_ledger IS 'Aavin Aalumai Shift Counter Ledger: Tamper-Evident Append-Only Production Database';
