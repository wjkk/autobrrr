import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';

import { sendAppError, toAppError } from '../lib/app-error.js';
import {
  registerDeliveryRoutes,
  registerPlannerRoutes,
  registerPlatformRoutes,
  registerProviderRoutes,
} from '../routes/register-domain-routes.js';

export async function createIntegrationApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  await app.register(cookie);
  await registerPlatformRoutes(app);
  await registerPlannerRoutes(app);
  await registerProviderRoutes(app);
  await registerDeliveryRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    return sendAppError(reply, toAppError(error));
  });

  await app.ready();
  return app;
}
