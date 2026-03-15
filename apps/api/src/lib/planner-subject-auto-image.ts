import type { CatalogSubjectImageGenerationInput } from './catalog-subject-image.js';
import { generateCatalogSubjectImageForUser } from './catalog-subject-image.js';

export interface PlannerSubjectAutoImageInput {
  name: string;
  subjectType: 'human' | 'animal' | 'creature' | 'object';
  description: string;
  modelFamily?: string;
  modelEndpoint?: string;
}

export function buildPlannerSubjectAutoImageInput(input: PlannerSubjectAutoImageInput): CatalogSubjectImageGenerationInput {
  return {
    name: input.name,
    subjectType: input.subjectType,
    description: input.description,
    modelFamily: input.modelFamily,
    modelEndpoint: input.modelEndpoint,
  };
}

export async function generatePlannerSubjectAutoImageForUser(args: {
  userId: string;
  input: PlannerSubjectAutoImageInput;
}) {
  return generateCatalogSubjectImageForUser({
    userId: args.userId,
    input: buildPlannerSubjectAutoImageInput(args.input),
  });
}
