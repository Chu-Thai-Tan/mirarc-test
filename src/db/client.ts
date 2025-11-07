import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Drizzle client will be created with undefined URL.');
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool);


