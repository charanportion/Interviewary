import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { registerWsRoutes } from './ws.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(websocket, {
    options: {
      // Audio frames will be small (~250ms opus chunks); 1 MiB is plenty.
      maxPayload: 1024 * 1024,
    },
  });

  app.get('/health', async () => ({ ok: true }));
  await app.register(registerWsRoutes);

  await app.listen({ host: '0.0.0.0', port: PORT });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
