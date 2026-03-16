export interface TransportHookMetadata {
  traceId?: string;
  runId?: string;
  userId?: string;
  projectId?: string;
  episodeId?: string;
  resourceType?: string;
  resourceId?: string;
  modelFamilyId?: string;
  modelProviderId?: string;
  modelEndpointId?: string;
  providerRequestId?: string;
  [key: string]: unknown;
}

export interface TransportHookEvent {
  providerCode: string;
  capability: 'text' | 'image' | 'video' | 'audio' | 'catalog';
  operation: string;
  request: {
    url: string;
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
  };
  response?: unknown;
  error?: {
    message: string;
  };
  latencyMs: number;
  metadata?: TransportHookMetadata;
}

export type TransportHook = (event: TransportHookEvent) => Promise<void> | void;

let activeTransportHook: TransportHook | null = null;

export function setTransportHook(hook: TransportHook | null) {
  activeTransportHook = hook;
}

export async function emitTransportHook(event: TransportHookEvent) {
  if (!activeTransportHook) {
    return;
  }
  await activeTransportHook(event);
}
