import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../lib/prisma.js';
import { finalizePlannerRun } from '../lib/run-lifecycle.js';
import { createIntegrationApp } from './test-app.js';
import { createPlannerOutlineFixture } from './test-fixtures.js';

function buildOutlineAssistantPackage() {
  return JSON.stringify({
    stage: 'outline',
    assistantMessage: '已生成大纲',
    documentTitle: '谜雾校园',
    outlineDoc: {
      projectTitle: '谜雾校园',
      contentType: '短剧漫剧',
      subtype: '悬疑',
      format: 'single',
      episodeCount: 1,
      genre: '校园悬疑',
      toneStyle: ['紧张', '克制'],
      premise: '学生在档案室发现失踪事件线索。',
      mainCharacters: [{ id: 'c1', name: '林夏', role: '主角', description: '学生侦探' }],
      storyArc: [{ episodeNo: 1, title: '档案室', summary: '进入档案室并发现线索。' }],
      constraints: [],
      openQuestions: [],
    },
    operations: {
      replaceDocument: false,
      generateStoryboard: false,
      confirmOutline: true,
    },
  });
}

function buildRefinementAssistantPackage() {
  return JSON.stringify({
    stage: 'refinement',
    assistantMessage: '已完成细化',
    documentTitle: '谜雾校园第1集',
    stepAnalysis: [
      {
        id: 'step-1',
        title: '拆解需求',
        status: 'done',
        details: ['完成主体、场景和分镜细化'],
      },
    ],
    structuredDoc: {
      projectTitle: '谜雾校园',
      episodeTitle: '第1集 档案室',
      episodeCount: 1,
      pointCost: 38,
      summaryBullets: ['林夏在档案室发现线索并决定追查。'],
      highlights: [{ title: '悬疑开场', description: '用夜色和档案室营造不安氛围。' }],
      styleBullets: ['冷色调', '低照度', '悬疑氛围'],
      subjectBullets: ['林夏：谨慎而执着。'],
      subjects: [{ entityType: 'subject', title: '林夏', prompt: '女学生侦探，冷静敏锐' }],
      sceneBullets: ['老旧档案室。'],
      scenes: [{ entityType: 'scene', title: '档案室', prompt: '老旧档案室，夜晚，冷色荧光灯' }],
      scriptSummary: ['1 个场景，1 个主体，1 个分镜。'],
      acts: [
        {
          title: '第一幕',
          time: '夜',
          location: '档案室',
          shots: [
            {
              title: '分镜01-1',
              visual: '林夏推开档案室铁门，灰尘在冷光中飘散',
              composition: '中景',
              motion: '推镜',
              voice: '旁白',
              line: '她知道，真相就在这扇门后。',
            },
          ],
        },
      ],
    },
    operations: {
      replaceDocument: true,
      generateStoryboard: false,
      confirmOutline: false,
    },
  });
}

test('planner outline confirm transitions workspace into refinement and persists refinement run output', async (t) => {
  const app = await createIntegrationApp();
  const fixture = await createPlannerOutlineFixture();

  t.after(async () => {
    await app.close();
    await fixture.cleanup();
  });

  const outlineQueueResponse = await app.inject({
    method: 'POST',
    url: `/api/projects/${fixture.projectId}/planner/generate-doc`,
    headers: {
      cookie: fixture.cookie,
    },
    payload: {
      episodeId: fixture.episodeId,
      prompt: '做一个校园悬疑短剧',
      subtype: '悬疑',
      modelFamily: fixture.familySlug,
      modelEndpoint: fixture.endpointSlug,
    },
  });
  assert.equal(outlineQueueResponse.statusCode, 202);
  const outlineQueuePayload = outlineQueueResponse.json() as {
    ok: true;
    data: {
      plannerSession: { id: string; status: string };
      targetStage: 'outline' | 'refinement';
      run: { id: string; status: string };
    };
  };
  assert.equal(outlineQueuePayload.data.targetStage, 'outline');
  assert.equal(outlineQueuePayload.data.run.status, 'queued');

  await prisma.run.update({
    where: { id: outlineQueuePayload.data.run.id },
    data: {
      status: 'RUNNING',
      providerStatus: 'succeeded',
      outputJson: {
        providerData: {
          output_text: buildOutlineAssistantPackage(),
        },
      },
    },
  });

  const outlineRun = await prisma.run.findUniqueOrThrow({
    where: { id: outlineQueuePayload.data.run.id },
  });
  const outlineFinalize = await finalizePlannerRun(outlineRun);
  assert.equal(outlineFinalize.status, 'completed');

  const activeOutline = await prisma.plannerOutlineVersion.findFirstOrThrow({
    where: {
      plannerSessionId: outlineQueuePayload.data.plannerSession.id,
      isActive: true,
    },
  });

  const confirmResponse = await app.inject({
    method: 'POST',
    url: `/api/projects/${fixture.projectId}/planner/outline-versions/${activeOutline.id}/confirm`,
    headers: {
      cookie: fixture.cookie,
    },
    payload: {
      episodeId: fixture.episodeId,
    },
  });
  assert.equal(confirmResponse.statusCode, 200);

  const refinementQueueResponse = await app.inject({
    method: 'POST',
    url: `/api/projects/${fixture.projectId}/planner/generate-doc`,
    headers: {
      cookie: fixture.cookie,
    },
    payload: {
      episodeId: fixture.episodeId,
      prompt: '继续细化第一集内容',
      subtype: '悬疑',
      modelFamily: fixture.familySlug,
      modelEndpoint: fixture.endpointSlug,
    },
  });
  assert.equal(refinementQueueResponse.statusCode, 202);
  const refinementQueuePayload = refinementQueueResponse.json() as {
    ok: true;
    data: {
      targetStage: 'outline' | 'refinement';
      run: { id: string; status: string };
    };
  };
  assert.equal(refinementQueuePayload.data.targetStage, 'refinement');
  assert.equal(refinementQueuePayload.data.run.status, 'queued');

  await prisma.run.update({
    where: { id: refinementQueuePayload.data.run.id },
    data: {
      status: 'RUNNING',
      providerStatus: 'succeeded',
      outputJson: {
        providerData: {
          output_text: buildRefinementAssistantPackage(),
        },
      },
    },
  });

  const refinementRun = await prisma.run.findUniqueOrThrow({
    where: { id: refinementQueuePayload.data.run.id },
  });
  const refinementFinalize = await finalizePlannerRun(refinementRun);
  assert.equal(refinementFinalize.status, 'completed');

  const workspaceResponse = await app.inject({
    method: 'GET',
    url: `/api/projects/${fixture.projectId}/planner/workspace?episodeId=${fixture.episodeId}`,
    headers: {
      cookie: fixture.cookie,
    },
  });
  assert.equal(workspaceResponse.statusCode, 200);
  const workspacePayload = workspaceResponse.json() as {
    ok: true;
    data: {
      plannerSession: { stage: string; status: string };
      activeOutline: { id: string; isConfirmed: boolean } | null;
      activeRefinement: {
        id: string;
        status: string;
        structuredDoc: { projectTitle: string; episodeTitle: string } | null;
      } | null;
      latestPlannerRun: { id: string; status: string } | null;
    };
  };
  assert.equal(workspacePayload.data.plannerSession.stage, 'refinement');
  assert.equal(workspacePayload.data.plannerSession.status, 'ready');
  assert.equal(workspacePayload.data.activeOutline?.id, activeOutline.id);
  assert.equal(workspacePayload.data.activeOutline?.isConfirmed, true);
  assert.equal(workspacePayload.data.activeRefinement?.status, 'ready');
  assert.equal(workspacePayload.data.activeRefinement?.structuredDoc?.projectTitle, '谜雾校园');
  assert.equal(workspacePayload.data.activeRefinement?.structuredDoc?.episodeTitle, '第1集 档案室');
  assert.equal(workspacePayload.data.latestPlannerRun?.id, refinementQueuePayload.data.run.id);
  assert.equal(workspacePayload.data.latestPlannerRun?.status, 'completed');
});
