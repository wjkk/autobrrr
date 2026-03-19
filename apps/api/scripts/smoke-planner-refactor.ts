import { strict as assert } from 'node:assert';

import { readVideoModelCapabilityFromFamily, summarizeVideoModelCapabilityForPlanner } from '../src/lib/model-capability.js';
import { buildPlannerGenerationPrompt, rebuildPlannerStructuredDocFromProjection } from '../src/lib/planner/index.js';
import { generateShotPrompts } from '../src/lib/shot-prompt-generator.js';

async function main() {
  const seedance = readVideoModelCapabilityFromFamily({
    id: 'family-seedance',
    slug: 'ark-seedance-2-video',
    name: 'ARK Seedance 2.0 Video',
    modelKind: 'VIDEO',
    capabilityJson: {
      supportsMultiShot: true,
      maxShotsPerGeneration: 6,
      timestampMeaning: 'narrative-hint',
      audioDescStyle: 'inline',
      referenceImageSupport: 'full',
      maxReferenceImages: 9,
      maxReferenceVideos: 3,
      maxReferenceAudios: 3,
      cameraVocab: 'chinese',
      maxDurationSeconds: 15,
      maxResolution: '2K',
      promptStyle: 'narrative',
    },
  });

  assert.equal(seedance.capability.supportsMultiShot, true);
  assert.equal(seedance.capability.maxShotsPerGeneration, 6);

  const plannerSummary = summarizeVideoModelCapabilityForPlanner({
    familySlug: seedance.familySlug,
    familyName: seedance.familyName,
    capability: seedance.capability,
  });
  assert.match(plannerSummary, /多镜头叙事/);

  const promptPackage = buildPlannerGenerationPrompt({
    selection: {
      contentType: '短剧漫剧',
      subtype: '对话剧情',
      agentProfile: {
        id: 'agent-1',
        slug: 'planner-agent',
        displayName: 'Planner Agent',
        defaultSystemPrompt: '你是专业策划助手。',
        defaultDeveloperPrompt: '输出结构化内容。',
        defaultStepDefinitionsJson: [],
      },
      subAgentProfile: {
        id: 'sub-agent-1',
        slug: 'dialogue-drama',
        displayName: '对话剧情',
        systemPromptOverride: null,
        developerPromptOverride: null,
        stepDefinitionsJson: [],
      },
    },
    targetStage: 'refinement',
    userPrompt: '把第一幕细化得更有节奏。',
    projectTitle: '雨夜机械猫',
    episodeTitle: '第一集',
    targetVideoModelFamilySlug: seedance.familySlug,
    targetVideoModelSummary: plannerSummary,
    priorMessages: [],
  });

  assert.match(promptPackage.promptText, /ark-seedance-2-video/);
  assert.match(promptPackage.promptText, /目标视频模型能力摘要/);
  assert.equal(promptPackage.promptSnapshot.inputContextSnapshot.targetVideoModelFamilySlug, seedance.familySlug);
  assert.equal(promptPackage.promptArtifact.targetVideoModelFamilySlug, seedance.familySlug);
  assert.equal(promptPackage.promptArtifact.promptText, promptPackage.promptText);
  assert.equal(promptPackage.promptArtifact.promptSnapshot.systemPromptFinal, promptPackage.promptSnapshot.systemPromptFinal);

  const multiShotPrompts = generateShotPrompts({
    modelFamilySlug: seedance.familySlug,
    capability: seedance.capability,
    shots: [
      {
        id: 'shot-1',
        actKey: 'act-1',
        actTitle: '第一幕',
        sceneName: '夜雨巷口',
        title: '分镜01-1',
        durationSeconds: 4,
        visualDescription: '少女站在霓虹雨夜的巷口，衣摆被风吹起',
        composition: '全景',
        cameraMotion: '推镜',
        dialogue: '她终于回来了。',
        soundDesign: '雨声密集，远处传来轻微电流噪音',
        sortOrder: 1,
      },
      {
        id: 'shot-2',
        actKey: 'act-1',
        actTitle: '第一幕',
        sceneName: '夜雨巷口',
        title: '分镜01-2',
        durationSeconds: 4,
        visualDescription: '镜头贴近她的眼神，瞳孔倒映故障霓虹',
        composition: '近景',
        cameraMotion: '摇镜',
        dialogue: '这座城还记得我吗？',
        soundDesign: '环境音压低，只留下呼吸和雨滴',
        sortOrder: 2,
      },
    ],
  });

  assert.equal(multiShotPrompts.length, 1);
  assert.equal(multiShotPrompts[0]?.mode, 'multi-shot');
  assert.deepEqual(multiShotPrompts[0]?.shotIds, ['shot-1', 'shot-2']);
  assert.match(multiShotPrompts[0]?.promptText ?? '', /雨声密集/);

  const singleShotPrompts = generateShotPrompts({
    modelFamilySlug: 'pika-2-x',
    capability: {
      supportsMultiShot: false,
      maxShotsPerGeneration: 1,
      timestampMeaning: 'ignored',
      audioDescStyle: 'none',
      referenceImageSupport: 'style',
      maxReferenceImages: 1,
      maxReferenceVideos: 0,
      maxReferenceAudios: 0,
      cameraVocab: 'english-cinematic',
      maxDurationSeconds: 5,
      maxResolution: '1080p',
      promptStyle: 'single-shot',
      knownIssues: [],
    },
    shots: [
      {
        id: 'shot-3',
        actKey: 'act-2',
        actTitle: '第二幕',
        sceneName: '地下车站',
        title: '分镜02-1',
        visualDescription: '角色在废弃站台上奔跑',
        composition: '中景',
        cameraMotion: '跟拍',
        dialogue: '别停下。',
        soundDesign: '脚步与回声',
        sortOrder: 3,
      },
    ],
  });

  assert.equal(singleShotPrompts.length, 1);
  assert.equal(singleShotPrompts[0]?.mode, 'single-shot');
  assert.match(singleShotPrompts[0]?.promptText ?? '', /medium shot/);
  assert.doesNotMatch(singleShotPrompts[0]?.promptText ?? '', /脚步与回声/);

  const rebuiltDoc = rebuildPlannerStructuredDocFromProjection({
    refinementVersion: {
      id: 'ref-1',
      sourceRunId: null,
      structuredDocJson: {
        projectTitle: '旧标题',
        episodeTitle: '第一集',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['旧摘要'],
        highlights: [{ title: '旧亮点', description: '旧说明' }],
        styleBullets: ['旧风格'],
        subjectBullets: ['旧主体'],
        subjects: [{ entityKey: 'subject-1', title: '旧角色', prompt: '旧提示词', generatedAssetIds: ['asset-a'] }],
        sceneBullets: ['旧场景'],
        scenes: [{ entityKey: 'scene-1', title: '旧场景', prompt: '旧场景提示', generatedAssetIds: ['asset-b'] }],
        scriptSummary: ['旧脚本摘要'],
        acts: [
          {
            title: '第一幕',
            time: '',
            location: '',
            shots: [
              {
                entityKey: 'shot-1',
                title: '旧分镜',
                visual: '旧画面',
                composition: '中景',
                motion: '推镜',
                voice: '旁白',
                line: '旧台词',
                targetModelFamilySlug: 'ark-seedance-2-video',
                generatedAssetIds: ['asset-c'],
              },
            ],
          },
        ],
      },
    },
    subjects: [
      {
        id: 'subject-1',
        name: '新角色名',
        appearance: '新外观描述',
        prompt: '新角色提示词',
        generatedAssetIdsJson: ['asset-a'],
        referenceAssetIdsJson: [],
        sortOrder: 1,
      },
    ],
    scenes: [
      {
        id: 'scene-1',
        name: '新场景名',
        time: '夜',
        description: '新场景描述',
        prompt: '新场景提示词',
        generatedAssetIdsJson: ['asset-b'],
        referenceAssetIdsJson: [],
        sortOrder: 1,
      },
    ],
    shotScripts: [
      {
        id: 'shot-1',
        sceneId: 'scene-1',
        actKey: 'act-1',
        actTitle: '第一幕',
        shotNo: '分镜01-1',
        title: '新分镜标题',
        targetModelFamilySlug: 'ark-seedance-2-video',
        visualDescription: '新画面描述',
        composition: '近景',
        cameraMotion: '推镜',
        voiceRole: '旁白',
        dialogue: '新台词',
        generatedAssetIdsJson: ['asset-c'],
        referenceAssetIdsJson: [],
        sortOrder: 1,
      },
    ],
  });

  assert.equal(rebuiltDoc.subjects[0]?.entityKey, 'subject-1');
  assert.deepEqual(rebuiltDoc.subjects[0]?.generatedAssetIds, ['asset-a']);
  assert.equal(rebuiltDoc.scenes[0]?.entityKey, 'scene-1');
  assert.equal(rebuiltDoc.acts[0]?.shots[0]?.entityKey, 'shot-1');
  assert.equal(rebuiltDoc.acts[0]?.shots[0]?.targetModelFamilySlug, 'ark-seedance-2-video');
  assert.deepEqual(rebuiltDoc.acts[0]?.shots[0]?.generatedAssetIds, ['asset-c']);

  console.log('[smoke-planner-refactor] ok');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[smoke-planner-refactor] failed: ${message}`);
  process.exitCode = 1;
});
