import fastify from 'fastify';
import cookie from '@fastify/cookie';

import { env } from './lib/env.js';
import { registerAssetRoutes } from './routes/assets.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCreationCommandRoutes } from './routes/creation-commands.js';
import { registerExploreCatalogRoutes } from './routes/explore-catalogs.js';
import { registerModelRegistryRoutes } from './routes/model-registry.js';
import { registerPlannerCommandRoutes } from './routes/planner-commands.js';
import { registerPlannerDocumentRoutes } from './routes/planner-document.js';
import { registerProviderConfigRoutes } from './routes/provider-configs.js';
import { registerProviderCallbackRoutes } from './routes/provider-callbacks.js';
import { registerPublishCommandRoutes } from './routes/publish-commands.js';
import { registerRunRoutes } from './routes/runs.js';
import { registerShotRoutes } from './routes/shots.js';
import { registerStudioProjectRoutes } from './routes/studio-projects.js';
import { registerWorkspaceRoutes } from './routes/workspaces.js';

const app = fastify({
  logger: true,
});

await app.register(cookie);

app.get('/health', async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerStudioProjectRoutes(app);
await registerWorkspaceRoutes(app);
await registerAssetRoutes(app);
await registerShotRoutes(app);
await registerExploreCatalogRoutes(app);
await registerModelRegistryRoutes(app);
await registerPlannerCommandRoutes(app);
await registerPlannerDocumentRoutes(app);
await registerProviderConfigRoutes(app);
await registerPublishCommandRoutes(app);
await registerCreationCommandRoutes(app);
await registerRunRoutes(app);
await registerProviderCallbackRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(500).send({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error.',
    },
  });
});

await app.listen({
  host: '0.0.0.0',
  port: env.API_PORT,
});
