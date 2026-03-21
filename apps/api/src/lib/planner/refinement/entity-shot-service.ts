import { syncPlannerRefinementProjection } from './projection.js';
import { prisma, requireEditableRefinement } from './entity-accessors.js';
import type { EntityResult, ScopedEntityArgs } from './entity-service-types.js';

export async function deletePlannerShot(args: ScopedEntityArgs & {
  shotScriptId: string;
}): Promise<EntityResult<{
  deleted: true;
  shotScriptId: string;
}>> {
  const access = await requireEditableRefinement(args);
  if (!access.ok) {
    return access;
  }

  const shot = await prisma.plannerShotScript.findFirst({
    where: {
      id: args.shotScriptId,
      refinementVersionId: access.activeRefinement.id,
    },
    select: { id: true },
  });
  if (!shot) {
    return { ok: false, error: 'SHOT_NOT_FOUND' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.plannerShotScript.delete({
      where: { id: shot.id },
    });

    await syncPlannerRefinementProjection({
      db: tx,
      refinementVersionId: access.activeRefinement.id,
    });
  });

  return {
    ok: true,
    data: {
      deleted: true,
      shotScriptId: shot.id,
    },
  };
}
