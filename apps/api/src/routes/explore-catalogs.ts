import type { FastifyInstance } from 'fastify';

import { registerExploreStyleRoutes } from './explore-style-routes.js';
import { registerExploreSubjectRoutes } from './explore-subject-routes.js';

export async function registerExploreCatalogRoutes(app: FastifyInstance) {
  await registerExploreSubjectRoutes(app);
  await registerExploreStyleRoutes(app);
}
