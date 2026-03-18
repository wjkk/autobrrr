export interface WorkspaceBootstrapError {
  code: string;
  message: string;
  status?: number;
}

function isAivApiErrorLike(error: unknown): error is {
  code: string;
  message: string;
  status?: number;
} {
  return !!error
    && typeof error === 'object'
    && typeof (error as { code?: unknown }).code === 'string'
    && typeof (error as { message?: unknown }).message === 'string';
}

export function toWorkspaceBootstrapError(error: unknown, fallbackMessage: string): WorkspaceBootstrapError {
  if (isAivApiErrorLike(error)) {
    return {
      code: error.code,
      message: error.message,
      ...(typeof error.status === 'number' ? { status: error.status } : {}),
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      code: 'WORKSPACE_BOOTSTRAP_FAILED',
      message: error.message,
    };
  }

  return {
    code: 'WORKSPACE_BOOTSTRAP_FAILED',
    message: fallbackMessage,
  };
}
