import { createApp } from './app';
import { env } from './config';
import { disconnectDb } from './lib';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Golden Fantasy API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/** Cierre ordenado: Railway/Render mandan SIGTERM al redeployar. */
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} recibido, cerrando servidor...`);
  server.close();
  await disconnectDb();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
