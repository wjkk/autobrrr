import type { FastifyInstance } from 'fastify';

import { registerPlannerRefinementSceneRoutes } from './planner-refinement-scene-routes.js';
import { registerPlannerRefinementShotRoutes } from './planner-refinement-shot-routes.js';
import { registerPlannerRefinementSubjectRoutes } from './planner-refinement-subject-routes.js';

export async function registerPlannerRefinementEntityRoutes(app: FastifyInstance) {
  await registerPlannerRefinementSubjectRoutes(app);
  await registerPlannerRefinementSceneRoutes(app);
  await registerPlannerRefinementShotRoutes(app);
}
