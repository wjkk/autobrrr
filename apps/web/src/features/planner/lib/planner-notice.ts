import { PlannerApiError, isPlannerApiError } from './planner-api';

export interface PlannerNoticeAction {
  href: string;
  label: string;
}

export interface PlannerNotice {
  tone?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string | null;
  action?: PlannerNoticeAction | null;
}

export type PlannerNoticeInput = PlannerNotice | string | null | undefined;

export function toPlannerNotice(input: PlannerNoticeInput): PlannerNotice | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return {
      tone: 'info',
      message: input,
    };
  }

  return {
    tone: input.tone ?? 'info',
    message: input.message,
    detail: input.detail ?? null,
    action: input.action ?? null,
  };
}

export function buildPlannerNoticeFromError(error: unknown, fallbackMessage: string): PlannerNotice {
  if (isPlannerApiError(error) && error.code === 'PROVIDER_NOT_CONFIGURED') {
    return {
      tone: 'warning',
      message: error.message,
      detail: '策划页 AI 主链路已关闭自动 mock 回退；只有配置并启用可用 Provider 后，才会真正请求模型执行。',
      action: {
        href: '/settings/providers',
        label: '前往 Provider 配置',
      },
    };
  }

  if (error instanceof PlannerApiError) {
    return {
      tone: 'error',
      message: error.message,
    };
  }

  return {
    tone: 'error',
    message: error instanceof Error ? error.message : fallbackMessage,
  };
}
