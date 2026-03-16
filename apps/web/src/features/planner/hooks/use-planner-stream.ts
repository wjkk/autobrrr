'use client';

import { useEffect, useRef, useState } from 'react';

import type { PlannerRuntimeApiContext } from '../lib/planner-api';

export interface PlannerStreamStep {
  id: string;
  stepKey: string;
  title: string;
  status: 'waiting' | 'running' | 'done' | 'failed';
  detail: Record<string, unknown> | null;
  sortOrder: number;
}

export interface PlannerStreamState {
  plannerSessionId: string | null;
  plannerStatus: string | null;
  refinementVersionId: string | null;
  runId: string | null;
  runStatus: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  steps: PlannerStreamStep[];
  terminal: boolean;
}

export function usePlannerStream(runtimeApi?: PlannerRuntimeApiContext) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [streamState, setStreamState] = useState<PlannerStreamState | null>(null);

  const stopPlannerStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  const startPlannerStream = (runId: string) => {
    if (!runtimeApi) {
      return;
    }

    stopPlannerStream();
    setStreamState(null);

    const search = new URLSearchParams({
      episodeId: runtimeApi.episodeId,
      runId,
    });
    const source = new EventSource(
      `/api/planner/projects/${encodeURIComponent(runtimeApi.projectId)}/stream?${search.toString()}`,
    );

    source.addEventListener('planner_state', (event) => {
      const message = event as MessageEvent<string>;
      try {
        const parsed = JSON.parse(message.data) as PlannerStreamState;
        setStreamState(parsed);
        if (parsed.terminal) {
          source.close();
          if (eventSourceRef.current === source) {
            eventSourceRef.current = null;
          }
        }
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    });

    source.onerror = () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };

    eventSourceRef.current = source;
  };

  useEffect(() => {
    return () => {
      stopPlannerStream();
    };
  }, []);

  return {
    streamState,
    startPlannerStream,
    stopPlannerStream,
  };
}
