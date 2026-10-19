import 'dotenv/config';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '../db/pool.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }

  const PgStore = connectPgSimple(session);

  return session({
    store: new PgStore({ pool, tableName: 'session' }),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS,
    },
  });
}
