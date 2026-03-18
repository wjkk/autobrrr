import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFallbackPlannerOutlineAssistantPackage,
  buildFallbackPlannerRefinementAssistantPackage,
  parsePlannerAssistantPackage,
} from './planner-agent-schemas.js';

const defaultSteps = [
  { id: 'step-1', title: 'Step 1', status: 'done' as const, details: ['完成'] },
];

test('planner agent schema fallback packages lock outline and refinement defaults', () => {
  const outline = buildFallbackPlannerOutlineAssistantPackage({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'series',
    generatedText: '围绕校园秘密展开多集剧情。',
  });
  const refinement = buildFallbackPlannerRefinementAssistantPackage({
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    generatedText: '完成细化。',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
  });

  assert.equal(outline.stage, 'outline');
  assert.equal(outline.operations.confirmOutline, true);
  assert.equal(outline.outlineDoc.format, 'series');
  assert.equal(refinement.stage, 'refinement');
  assert.equal(refinement.operations.replaceDocument, true);
  assert.equal(refinement.stepAnalysis[0]?.id, 'step-1');
});

test('parsePlannerAssistantPackage accepts matching stage payload and falls back on stage mismatch or invalid json', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'outline',
    rawText: [
      '```json',
      JSON.stringify({
        stage: 'outline',
        assistantMessage: '已生成大纲',
        documentTitle: '谜雾校园',
        outlineDoc: {
          projectTitle: '谜雾校园',
          contentType: 'drama',
          subtype: '悬疑',
          format: 'single',
          episodeCount: 1,
          genre: '校园悬疑',
          toneStyle: ['紧张'],
          premise: '主角发现档案后卷入事件。',
          mainCharacters: [{ id: 'c1', name: '林夏', role: '主角', description: '学生侦探' }],
          storyArc: [{ episodeNo: 1, title: '档案室', summary: '进入档案室' }],
          constraints: [],
          openQuestions: [],
        },
        operations: {
          replaceDocument: false,
          generateStoryboard: false,
          confirmOutline: true,
        },
      }),
      '```',
    ].join('\n'),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  const mismatch = parsePlannerAssistantPackage({
    targetStage: 'outline',
    rawText: JSON.stringify({
      stage: 'refinement',
      assistantMessage: '错误阶段',
      stepAnalysis: defaultSteps,
      structuredDoc: {
        projectTitle: '谜雾校园',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 38,
        summaryBullets: ['摘要'],
        highlights: [{ title: '亮点', description: '说明' }],
        styleBullets: ['风格'],
        subjectBullets: ['主体'],
        subjects: [{ entityType: 'subject', title: '主角', prompt: '提示词' }],
        sceneBullets: ['场景'],
        scenes: [{ entityType: 'scene', title: '场景', prompt: '提示词' }],
        scriptSummary: ['摘要'],
        acts: [{ title: '第一幕', time: '', location: '', shots: [{ title: '01', visual: '画面', composition: '构图', motion: '运镜', voice: '旁白', line: '台词' }] }],
      },
      operations: { replaceDocument: true, generateStoryboard: false, confirmOutline: false },
    }),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  const invalid = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText: '{"broken":true}',
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'outline');
  assert.equal(parsed.documentTitle, '谜雾校园');
  assert.equal(mismatch.stage, 'outline');
  assert.equal(mismatch.operations.confirmOutline, true);
  assert.equal(invalid.stage, 'refinement');
  assert.equal(invalid.stepAnalysis[0]?.id, 'step-1');
});

test('parsePlannerAssistantPackage normalizes common refinement package variants into structured doc schema', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText: JSON.stringify({
      stage: 'refinement',
      assistantMessage: '已完成细化。',
      stepAnalysis: {
        stepId: 'step-1',
        status: 'done',
        details: ['完成细化文档'],
      },
      documentTitle: '都市悬疑短剧《失踪录像带》单集细化策划文档',
      structuredDoc: {
        故事梗概: '林晓收到匿名包裹后开始调查失踪录像带，并在夜场追查中逼近真相。',
        三幕主体剧情: {
          '第一幕': '林晓收到线索并决定出发。',
          '第二幕': '她潜入夜场，发现自己被跟踪。',
          '第三幕': '她拿到录像带并反制对手。',
        },
        场景设定: [
          '林晓的出租屋',
          { 场景名称: '夜场消防通道', 场景描述: '狭长昏暗，只有应急灯闪烁。' },
        ],
        '分镜剧本（适配模型）': [
          {
            幕数: '第一幕',
            分镜组时长: '约14秒',
            分镜内容: [
              {
                镜头序号: 1,
                镜头语言: '推镜',
                画面内容: '林晓拆开匿名包裹。',
                音效: '纸袋摩擦声',
              },
            ],
          },
        ],
      },
      operations: ['确认细化内容'],
    }),
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'refinement');
  assert.equal(Array.isArray(parsed.stepAnalysis), true);
  assert.equal(parsed.stepAnalysis[0]?.id, 'step-1');
  assert.equal(parsed.operations.replaceDocument, true);
  assert.equal(parsed.structuredDoc.summaryBullets[0], '林晓收到匿名包裹后开始调查失踪录像带，并在夜场追查中逼近真相。');
  assert.equal(parsed.structuredDoc.acts[0]?.shots[0]?.motion, '推镜');
  assert.equal(parsed.structuredDoc.acts[0]?.shots[0]?.line, '纸袋摩擦声');
});

test('parsePlannerAssistantPackage normalizes legacy outline payloads and strips embedded json strings', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'outline',
    rawText: JSON.stringify({
      stage: 'outline',
      assistantMessage: '已生成大纲',
      outlineDoc: {
        核心主题: JSON.stringify({
          outlineDoc: {
            核心主题: '学生记者追查旧档案背后的失踪案。',
          },
        }),
        人物设定: {
          林夏: JSON.stringify({
            description: '执着追查真相的校园记者。',
          }),
        },
        三幕结构剧情详情: {
          第一幕: JSON.stringify({
            assistantMessage: '林夏深夜潜入档案室寻找线索。',
          }),
        },
      },
      operations: {
        replaceDocument: false,
        generateStoryboard: false,
        confirmOutline: true,
      },
    }),
    userPrompt: '做一个校园悬疑短剧',
    projectTitle: '谜雾校园',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'outline');
  assert.equal(parsed.outlineDoc.premise, '学生记者追查旧档案背后的失踪案。');
  assert.equal(parsed.outlineDoc.mainCharacters[0]?.name, '林夏');
  assert.equal(parsed.outlineDoc.mainCharacters[0]?.description, '执着追查真相的校园记者。');
  assert.equal(parsed.outlineDoc.storyArc[0]?.summary, '林夏深夜潜入档案室寻找线索。');
});

test('parsePlannerAssistantPackage falls back with cleaned text when provider returns truncated assistant package json', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText: '{"stage":"refinement","assistantMessage":"已完成细化。","structuredDoc":{"summaryBullets":["猫咪在雨夜守住自己的领地。"],"acts":[{"shots":[{"line":"守住这里。"}]}]',
    userPrompt: '做一个猫咪领地冲突短片',
    projectTitle: '小绿计划',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '对话剧情',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'refinement');
  assert.equal(parsed.structuredDoc.summaryBullets[0], '猫咪在雨夜守住自己的领地。');
  assert.equal(parsed.structuredDoc.acts[0]?.shots[0]?.line, '猫咪在雨夜守住自己的领地。');
});

test('parsePlannerAssistantPackage preserves native structured doc fields when normalization is needed', () => {
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText: JSON.stringify({
      stage: 'refinement',
      assistantMessage: '已完成细化。',
      stepAnalysis: defaultSteps,
      structuredDoc: {
        projectTitle: '失踪录像带',
        episodeTitle: '第1集',
        episodeCount: 1,
        pointCost: 40,
        summaryBullets: ['林溪接到匿名线索，开始追查失踪录像带。'],
        highlights: [{ title: '悬念递进', description: '每一幕都推进新的风险。' }],
        styleBullets: ['冷色调都市悬疑氛围。'],
        subjectBullets: ['林溪：调查记者，敏锐克制。'],
        subjects: [{ entityType: 'subject', title: '林溪', prompt: '短发调查记者，神情警觉。' }],
        sceneBullets: ['深夜报社编辑室'],
        scenes: [{ entityType: 'scene', title: '深夜报社编辑室', prompt: '冷蓝色灯光，堆满稿件。' }],
        scriptSummary: '单集三幕悬疑短剧。',
        acts: [
          {
            title: '第1幕',
            time: '深夜',
            location: '报社',
            shots: [
              {
                title: '分镜01-1',
                visual: '林溪查看匿名邮件。',
                composition: '近景',
                motion: '缓慢推近',
                voice: '林溪',
                line: '',
              },
            ],
          },
        ],
      },
      operations: { replaceDocument: true, generateStoryboard: false, confirmOutline: false },
    }),
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'refinement');
  assert.equal(parsed.structuredDoc.pointCost, 40);
  assert.equal(parsed.structuredDoc.summaryBullets[0], '林溪接到匿名线索，开始追查失踪录像带。');
  assert.equal(parsed.structuredDoc.highlights[0]?.title, '悬念递进');
  assert.equal(parsed.structuredDoc.styleBullets[0], '冷色调都市悬疑氛围。');
  assert.equal(parsed.structuredDoc.subjectBullets[0], '林溪：调查记者，敏锐克制。');
  assert.equal(parsed.structuredDoc.subjects[0]?.entityType, 'subject');
  assert.equal(parsed.structuredDoc.subjects[0]?.title, '林溪');
  assert.equal(parsed.structuredDoc.subjects[0]?.prompt, '短发调查记者，神情警觉。');
  assert.equal(parsed.structuredDoc.sceneBullets[0], '深夜报社编辑室');
  assert.equal(parsed.structuredDoc.scenes[0]?.entityType, 'scene');
  assert.equal(parsed.structuredDoc.scenes[0]?.title, '深夜报社编辑室');
  assert.equal(parsed.structuredDoc.scriptSummary[0], '单集三幕悬疑短剧。');
  assert.equal(parsed.structuredDoc.acts[0]?.shots[0]?.line, '无对白，以动作和氛围推进。');
});

test('parsePlannerAssistantPackage accepts balanced json prefix when provider appends extra closing tokens', () => {
  const rawText = `${JSON.stringify({
    stage: 'refinement',
    assistantMessage: '已完成细化。',
    stepAnalysis: defaultSteps,
    documentTitle: '失踪录像带',
    structuredDoc: {
      projectTitle: '失踪录像带',
      episodeTitle: '第1集',
      episodeCount: 1,
      pointCost: 40,
      summaryBullets: ['林默开始追查失踪录像带。'],
      highlights: [{ title: '悬念递进', description: '每一幕都推进新的风险。' }],
      styleBullets: ['冷色调都市悬疑氛围。'],
      subjectBullets: ['林默：调查记者，敏锐克制。'],
      subjects: [{ entityType: 'subject', title: '林默', prompt: '短发调查记者，神情警觉。' }],
      sceneBullets: ['深夜报社编辑室'],
      scenes: [{ entityType: 'scene', title: '深夜报社编辑室', prompt: '冷蓝色灯光，堆满稿件。' }],
      scriptSummary: '单集三幕悬疑短剧。',
      acts: [
        {
          title: '第1幕',
          time: '深夜',
          location: '报社',
          shots: [
            {
              title: '分镜01-1',
              visual: '林默查看匿名邮件。',
              composition: '近景',
              motion: '缓慢推近',
              voice: '林默',
              line: '线索出现了。',
            },
          ],
        },
      ],
    },
    operations: { replaceDocument: true, generateStoryboard: false, confirmOutline: false },
  })}}"`;
  const parsed = parsePlannerAssistantPackage({
    targetStage: 'refinement',
    rawText,
    userPrompt: '做一个都市悬疑短剧',
    projectTitle: '失踪录像带',
    episodeTitle: '第1集',
    defaultSteps,
    contentType: '短剧漫剧',
    subtype: '悬疑',
    contentMode: 'single',
  });

  assert.equal(parsed.stage, 'refinement');
  assert.equal(parsed.assistantMessage, '已完成细化。');
  assert.equal(parsed.structuredDoc.subjects[0]?.title, '林默');
  assert.equal(parsed.structuredDoc.subjectBullets[0], '林默：调查记者，敏锐克制。');
  assert.equal(parsed.structuredDoc.acts[0]?.shots[0]?.line, '线索出现了。');
});
