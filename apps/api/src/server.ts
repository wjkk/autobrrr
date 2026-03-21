import fastify from 'fastify';
import cookie from '@fastify/cookie';

import { sendAppError, toAppError } from './lib/app-error.js';
import { registerGeneratedUploadRoutes } from './lib/asset-storage.js';
import { env } from './lib/env.js';
import { createExternalApiCallLogHook } from './lib/external-api-call-logs.js';
import { setTransportHook } from './lib/transport-hooks.js';
import {
  registerDeliveryRoutes,
  registerPlannerRoutes,
  registerPlatformRoutes,
  registerProviderRoutes,
} from './routes/register-domain-routes.js';

const app = fastify({
  logger: true,
});

setTransportHook(createExternalApiCallLogHook());

await app.register(cookie);

app.get('/health', async () => ({ ok: true }));
await registerGeneratedUploadRoutes(app);
await registerPlatformRoutes(app);
await registerPlannerRoutes(app);
await registerProviderRoutes(app);
await registerDeliveryRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  const appError = toAppError(error);
  if (appError.statusCode >= 500) {
    app.log.error(error);
  } else {
    app.log.warn({ err: error }, appError.message);
  }
  return sendAppError(reply, appError);
});

await app.listen({
  host: '0.0.0.0',
  port: env.API_PORT,
});
