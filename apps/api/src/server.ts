import fastify from 'fastify';
import cookie from '@fastify/cookie';

import { registerGeneratedUploadRoutes } from './lib/asset-storage.js';
import { env } from './lib/env.js';
import { createExternalApiCallLogHook } from './lib/external-api-call-logs.js';
import { setTransportHook } from './lib/transport-hooks.js';
import { registerAssetRoutes } from './routes/assets.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCreationCommandRoutes } from './routes/creation-commands.js';
import { registerExploreCatalogRoutes } from './routes/explore-catalogs.js';
import { registerModelRegistryRoutes } from './routes/model-registry.js';
import { registerPlannerAgentProfileRoutes } from './routes/planner-agent-profiles.js';
import { registerPlannerCommandRoutes } from './routes/planner-commands.js';
import { registerPlannerDebugRoutes } from './routes/planner-debug.js';
import { registerPlannerDocumentRoutes } from './routes/planner-document.js';
import { registerPlannerFinalizeRoutes } from './routes/planner-finalize.js';
import { registerPlannerMediaGenerationRoutes } from './routes/planner-media-generation.js';
import { registerPlannerOutlineVersionRoutes } from './routes/planner-outline-versions.js';
import { registerPlannerPartialRerunRoutes } from './routes/planner-partial-reruns.js';
import { registerPlannerRefinementEntityRoutes } from './routes/planner-refinement-entities.js';
import { registerPlannerRefinementVersionRoutes } from './routes/planner-refinement-versions.js';
import { registerPlannerShotPromptRoutes } from './routes/planner-shot-prompts.js';
import { registerPlannerStreamRoutes } from './routes/planner-stream.js';
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

setTransportHook(createExternalApiCallLogHook());

await app.register(cookie);

app.get('/health', async () => ({ ok: true }));
await registerGeneratedUploadRoutes(app);

await registerAuthRoutes(app);
await registerStudioProjectRoutes(app);
await registerWorkspaceRoutes(app);
await registerAssetRoutes(app);
await registerShotRoutes(app);
await registerExploreCatalogRoutes(app);
await registerModelRegistryRoutes(app);
await registerPlannerAgentProfileRoutes(app);
await registerPlannerCommandRoutes(app);
await registerPlannerDebugRoutes(app);
await registerPlannerDocumentRoutes(app);
await registerPlannerFinalizeRoutes(app);
await registerPlannerMediaGenerationRoutes(app);
await registerPlannerOutlineVersionRoutes(app);
await registerPlannerPartialRerunRoutes(app);
await registerPlannerRefinementEntityRoutes(app);
await registerPlannerRefinementVersionRoutes(app);
await registerPlannerShotPromptRoutes(app);
await registerPlannerStreamRoutes(app);
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
