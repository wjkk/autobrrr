import type { FastifyInstance } from 'fastify';

import { registerAssetRoutes } from './assets.js';
import { registerAuthRoutes } from './auth.js';
import { registerCreationCommandRoutes } from './creation-commands.js';
import { registerExploreCatalogRoutes } from './explore-catalogs.js';
import { registerModelRegistryRoutes } from './model-registry.js';
import { registerPlannerAgentProfileRoutes } from './planner-agent-profiles.js';
import { registerPlannerCommandRoutes } from './planner-commands.js';
import { registerPlannerDebugRoutes } from './planner-debug.js';
import { registerPlannerDocumentRoutes } from './planner-document.js';
import { registerPlannerFinalizeRoutes } from './planner-finalize.js';
import { registerPlannerMediaGenerationRoutes } from './planner-media-generation.js';
import { registerPlannerOutlineVersionRoutes } from './planner-outline-versions.js';
import { registerPlannerPartialRerunRoutes } from './planner-partial-reruns.js';
import { registerPlannerRefinementEntityRoutes } from './planner-refinement-entities.js';
import { registerPlannerRefinementVersionRoutes } from './planner-refinement-versions.js';
import { registerPlannerShotPromptRoutes } from './planner-shot-prompts.js';
import { registerPlannerStreamRoutes } from './planner-stream.js';
import { registerProviderCallbackRoutes } from './provider-callbacks.js';
import { registerProviderConfigRoutes } from './provider-configs.js';
import { registerPublishCommandRoutes } from './publish-commands.js';
import { registerRunRoutes } from './runs.js';
import { registerShotRoutes } from './shots.js';
import { registerStudioProjectRoutes } from './studio-projects.js';
import { registerWorkspaceRoutes } from './workspaces.js';

export async function registerPlatformRoutes(app: FastifyInstance) {
  await registerAuthRoutes(app);
  await registerStudioProjectRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerAssetRoutes(app);
  await registerShotRoutes(app);
  await registerExploreCatalogRoutes(app);
  await registerModelRegistryRoutes(app);
  await registerRunRoutes(app);
}

export async function registerPlannerRoutes(app: FastifyInstance) {
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
}

export async function registerProviderRoutes(app: FastifyInstance) {
  await registerProviderConfigRoutes(app);
  await registerProviderCallbackRoutes(app);
}

export async function registerDeliveryRoutes(app: FastifyInstance) {
  await registerCreationCommandRoutes(app);
  await registerPublishCommandRoutes(app);
}
