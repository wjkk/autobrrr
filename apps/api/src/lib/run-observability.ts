export function buildWorkerLogEntry(
  event: 'idle' | 'run_processed' | 'worker_failed',
  payload: Record<string, unknown> = {},
) {
  return {
    scope: 'worker',
    event,
    ...payload,
  };
}

export function buildProviderCallbackLogEntry(
  event: 'received' | 'running' | 'failed' | 'completed' | 'terminal_short_circuit',
  payload: Record<string, unknown> = {},
) {
  return {
    scope: 'provider_callback',
    event,
    ...payload,
  };
}

export function buildRunFailureLogEntry(payload: {
  runId: string;
  errorCode: string;
  errorMessage: string;
}) {
  return {
    scope: 'run_lifecycle',
    event: 'run_failed',
    ...payload,
  };
}
