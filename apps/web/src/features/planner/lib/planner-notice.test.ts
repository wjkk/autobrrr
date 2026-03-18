import assert from 'node:assert/strict';
import test from 'node:test';

import { PlannerApiError } from './planner-api';
import { buildPlannerNoticeFromError, toPlannerNotice } from './planner-notice';

test('toPlannerNotice normalizes plain string notices', () => {
  assert.deepEqual(toPlannerNotice('已提交任务。'), {
    tone: 'info',
    message: '已提交任务。',
  });
});

test('buildPlannerNoticeFromError maps missing provider config to settings CTA', () => {
  const notice = buildPlannerNoticeFromError(
    new PlannerApiError({
      message: '请先配置 Provider。',
      code: 'PROVIDER_NOT_CONFIGURED',
      status: 409,
    }),
    'fallback',
  );

  assert.deepEqual(notice, {
    tone: 'warning',
    message: '请先配置 Provider。',
    detail: '策划页 AI 主链路已关闭自动 mock 回退；只有配置并启用可用 Provider 后，才会真正请求模型执行。',
    action: {
      href: '/settings/providers',
      label: '前往 Provider 配置',
    },
  });
});
