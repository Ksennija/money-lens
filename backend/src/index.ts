import { createApp } from './app.js';
import { prisma } from './db/client.js';
import { pool } from './db/pool.js';

const PORT = Number(process.env.PORT) || 3000;

const server = createApp().listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

// Stop accepting requests, let running ones finish, then release the database connections.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  try {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Shutdown failed', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
