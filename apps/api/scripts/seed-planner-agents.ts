import { prisma } from '../src/lib/prisma.js';

import { plannerAgentSeedProfiles } from './data/planner-agent-seed-data.js';

async function main() {
  for (const profile of plannerAgentSeedProfiles) {
    const agentProfile = await prisma.plannerAgentProfile.upsert({
      where: { slug: profile.slug },
      update: {
        contentType: profile.contentType,
        displayName: profile.displayName,
        description: profile.description,
        defaultSystemPrompt: profile.defaultSystemPrompt,
        defaultDeveloperPrompt: profile.defaultDeveloperPrompt,
        defaultStepDefinitionsJson: profile.defaultStepDefinitionsJson,
        defaultInputSchemaJson: profile.defaultInputSchemaJson,
        defaultOutputSchemaJson: profile.defaultOutputSchemaJson,
        enabled: true,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      create: {
        slug: profile.slug,
        contentType: profile.contentType,
        displayName: profile.displayName,
        description: profile.description,
        defaultSystemPrompt: profile.defaultSystemPrompt,
        defaultDeveloperPrompt: profile.defaultDeveloperPrompt,
        defaultStepDefinitionsJson: profile.defaultStepDefinitionsJson,
        defaultInputSchemaJson: profile.defaultInputSchemaJson,
        defaultOutputSchemaJson: profile.defaultOutputSchemaJson,
        enabled: true,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });

    for (const subAgent of profile.subAgents) {
      await prisma.plannerSubAgentProfile.upsert({
        where: { slug: subAgent.slug },
        update: {
          agentProfileId: agentProfile.id,
          subtype: subAgent.subtype,
          displayName: subAgent.displayName,
          description: subAgent.description,
          systemPromptOverride: subAgent.systemPromptOverride,
          developerPromptOverride: subAgent.developerPromptOverride,
          stepDefinitionsJson: subAgent.stepDefinitionsJson,
          inputSchemaJson: subAgent.inputSchemaJson,
          outputSchemaJson: subAgent.outputSchemaJson,
          toolPolicyJson: subAgent.toolPolicyJson,
          defaultGenerationConfigJson: subAgent.defaultGenerationConfigJson,
          enabled: true,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
        create: {
          agentProfileId: agentProfile.id,
          slug: subAgent.slug,
          subtype: subAgent.subtype,
          displayName: subAgent.displayName,
          description: subAgent.description,
          systemPromptOverride: subAgent.systemPromptOverride,
          developerPromptOverride: subAgent.developerPromptOverride,
          stepDefinitionsJson: subAgent.stepDefinitionsJson,
          inputSchemaJson: subAgent.inputSchemaJson,
          outputSchemaJson: subAgent.outputSchemaJson,
          toolPolicyJson: subAgent.toolPolicyJson,
          defaultGenerationConfigJson: subAgent.defaultGenerationConfigJson,
          enabled: true,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
      });
    }
  }

  console.log(`[seed-planner-agents] seeded ${plannerAgentSeedProfiles.length} planner agent profiles`);
}

main()
  .catch((error) => {
    console.error('[seed-planner-agents] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
