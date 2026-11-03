-- The backend connects to Postgres directly (Prisma / pg) and never uses the Supabase Data API,
-- so the API roles get no access to the public schema.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- Every other table already has row level security enabled.
ALTER TABLE "ExchangeRate" ENABLE ROW LEVEL SECURITY;
