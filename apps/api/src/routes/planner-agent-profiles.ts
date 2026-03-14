import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const querySchema = z.object({
  contentType: z.string().trim().min(1).max(64).optional(),
});

export async function registerPlannerAgentProfileRoutes(app: FastifyInstance) {
  app.get('/api/planner/agent-profiles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid planner agent query.',
        },
      });
    }

    const profiles = await prisma.plannerAgentProfile.findMany({
      where: {
        enabled: true,
        ...(query.data.contentType ? { contentType: query.data.contentType } : {}),
      },
      include: {
        subAgentProfiles: {
          where: { enabled: true },
          orderBy: [
            { subtype: 'asc' },
            { version: 'desc' },
          ],
        },
      },
      orderBy: [
        { contentType: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    return reply.send({
      ok: true,
      data: profiles.map((profile) => ({
        id: profile.id,
        slug: profile.slug,
        contentType: profile.contentType,
        displayName: profile.displayName,
        description: profile.description,
        version: profile.version,
        status: profile.status.toLowerCase(),
        defaultSystemPrompt: profile.defaultSystemPrompt,
        defaultDeveloperPrompt: profile.defaultDeveloperPrompt,
        defaultStepDefinitionsJson: profile.defaultStepDefinitionsJson,
        defaultInputSchemaJson: profile.defaultInputSchemaJson,
        defaultOutputSchemaJson: profile.defaultOutputSchemaJson,
        subAgentProfiles: profile.subAgentProfiles.map((subAgent) => ({
          id: subAgent.id,
          slug: subAgent.slug,
          subtype: subAgent.subtype,
          displayName: subAgent.displayName,
          description: subAgent.description,
          version: subAgent.version,
          status: subAgent.status.toLowerCase(),
          systemPromptOverride: subAgent.systemPromptOverride,
          developerPromptOverride: subAgent.developerPromptOverride,
          stepDefinitionsJson: subAgent.stepDefinitionsJson,
          inputSchemaJson: subAgent.inputSchemaJson,
          outputSchemaJson: subAgent.outputSchemaJson,
          toolPolicyJson: subAgent.toolPolicyJson,
          defaultGenerationConfigJson: subAgent.defaultGenerationConfigJson,
        })),
      })),
    });
  });
}
