import { Prisma } from '@prisma/client';

import { prisma } from '../../prisma.js';

type PlannerDbClient = Prisma.TransactionClient | typeof prisma;

export async function createPlannerUserMessage(args: {
  db: PlannerDbClient;
  plannerSessionId: string;
  userId: string;
  prompt: string;
}) {
  return args.db.plannerMessage.create({
    data: {
      plannerSessionId: args.plannerSessionId,
      role: 'USER',
      messageType: 'USER_INPUT',
      contentJson: {
        text: args.prompt,
      } satisfies Prisma.InputJsonValue,
      createdById: args.userId,
    },
  });
}
