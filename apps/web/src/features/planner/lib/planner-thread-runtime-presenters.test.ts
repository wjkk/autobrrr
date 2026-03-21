import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readPlannerThreadDiffSummary,
  readPlannerThreadOutlineDoc,
  readPlannerThreadReceiptDebugRunId,
  readPlannerThreadReceiptTitle,
  readPlannerThreadSteps,
} from './planner-thread-runtime-presenters';

test('readPlannerThreadSteps keeps only object steps', () => {
  assert.deepEqual(
    readPlannerThreadSteps({
      steps: [
        { title: '收集设定', status: 'done' },
        'bad-step',
        { title: '生成剧情', status: 'running' },
      ],
    }),
    [
      { title: '收集设定', status: 'done' },
      { title: '生成剧情', status: 'running' },
    ],
  );
});

test('readPlannerThreadOutlineDoc and receipt helpers normalize optional payloads', () => {
  assert.deepEqual(
    readPlannerThreadOutlineDoc({ outlineDoc: { projectTitle: '夜航者' } }),
    { projectTitle: '夜航者' },
  );
  assert.equal(readPlannerThreadOutlineDoc({ outlineDoc: ['bad'] }), null);

  assert.equal(
    readPlannerThreadReceiptTitle({
      messageType: 'assistant_document_receipt',
      rawContent: { documentTitle: '终稿 V3' },
      runtimeDocumentTitle: '运行时标题',
    }),
    '终稿 V3',
  );
  assert.equal(
    readPlannerThreadReceiptTitle({
      messageType: 'assistant_text',
      rawContent: { documentTitle: 'ignored' },
      runtimeDocumentTitle: '运行时标题',
    }),
    '运行时标题',
  );

  assert.deepEqual(
    readPlannerThreadDiffSummary({ diffSummary: ['新增主角关系', '', 1] }),
    ['新增主角关系'],
  );
  assert.equal(readPlannerThreadReceiptDebugRunId({ debugRunId: ' debug-run-1 ' }), 'debug-run-1');
  assert.equal(readPlannerThreadReceiptDebugRunId({ debugRunId: '' }), null);
});
