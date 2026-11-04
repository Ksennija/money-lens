import 'dotenv/config';
import pg from 'pg';

const DEFAULT_POOL_MAX = 10;

// One pool shared by the session store and Prisma, so the app opens a single set of connections.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || DEFAULT_POOL_MAX,
});
