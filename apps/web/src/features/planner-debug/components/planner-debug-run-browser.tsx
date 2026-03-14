'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerDebugRunDetail, PlannerDebugRunListItem } from '../lib/planner-agent-debug-types';

interface EnvelopeSuccess<T> {
  ok: true;
  data: T;
}

interface EnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

type Envelope<T> = EnvelopeSuccess<T> | EnvelopeFailure;

function executionModeLabel(mode: string) {
  return mode === 'live' ? '真实模型' : '回退生成';
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? 'Request failed.' : payload.error.message);
  }

  return payload.data;
}

interface PlannerDebugRunBrowserProps {
  initialRunId?: string;
}

export function PlannerDebugRunBrowser({ initialRunId }: PlannerDebugRunBrowserProps) {
  const [runs, setRuns] = useState<PlannerDebugRunListItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<PlannerDebugRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [runList, runDetail] = await Promise.all([
          requestJson<PlannerDebugRunListItem[]>('/api/planner/debug/runs'),
          initialRunId ? requestJson<PlannerDebugRunDetail>(`/api/planner/debug/runs/${encodeURIComponent(initialRunId)}`) : Promise.resolve(null),
        ]);
        if (cancelled) {
          return;
        }
        setRuns(runList);
        setSelectedRun(runDetail ?? null);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : '加载调试历史失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialRunId]);

  const handleSelect = async (runId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await requestJson<PlannerDebugRunDetail>(`/api/planner/debug/runs/${encodeURIComponent(runId)}`);
      setSelectedRun(detail);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '加载调试详情失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = async () => {
    if (!selectedRun) {
      return;
    }

    setReplaying(true);
    setError(null);
    try {
      const replayed = await requestJson<{ debugRunId: string }>(
        `/api/planner/debug/runs/${encodeURIComponent(selectedRun.id)}/replay`,
        { method: 'POST' },
      );
      const [runList, runDetail] = await Promise.all([
        requestJson<PlannerDebugRunListItem[]>('/api/planner/debug/runs'),
        requestJson<PlannerDebugRunDetail>(`/api/planner/debug/runs/${encodeURIComponent(replayed.debugRunId)}`),
      ]);
      setRuns(runList);
      setSelectedRun(runDetail);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '重放调试运行失败。');
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>策划调试回放</div>
            <h1 className={styles.title}>策划 Agent 调试回放</h1>
            <p className={styles.subtitle}>这里只看调试历史与详情回放，不进入主流程，也不直接编辑配置。</p>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaPill}>调试记录来自 MySQL 表</div>
            <div className={styles.metaPill}>支持从列表跳转到具体 run</div>
          </div>
        </section>

        {error ? <div className={`${styles.message} ${styles.messageError}`}>{error}</div> : null}

        <section className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>历史运行</h2>
                <p className={styles.panelHint}>按时间倒序展示最近的 planner debug run。</p>
              </div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.historyList}>
                {runs.map((run) => (
                  <button key={run.id} type="button" className={styles.historyRunItem} onClick={() => handleSelect(run.id)}>
                    <div className={styles.catalogTitle}>
                      <span>{run.compareLabel ? `${run.compareLabel} · ` : ''}{run.subAgentProfile?.displayName ?? '未知子 Agent'}</span>
                      <span className={styles.status}>{executionModeLabel(run.executionMode)}</span>
                    </div>
                    <div className={styles.catalogMeta}>
                      <div>{new Date(run.createdAt).toLocaleString('zh-CN')}</div>
                      <div>{run.id}</div>
                    </div>
                  </button>
                ))}
                {!runs.length && !loading ? <div className={styles.fieldHint}>暂无调试历史。</div> : null}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>运行详情</h2>
                <p className={styles.panelHint}>查看持久化的 prompt、原始输出和结构化结果。</p>
              </div>
              <button type="button" className={styles.buttonGhost} onClick={handleReplay} disabled={!selectedRun || replaying}>
                {replaying ? '重放中…' : '按当前 run 重放'}
              </button>
            </div>
            <div className={styles.panelBody}>
              {loading ? <div className={styles.fieldHint}>正在加载…</div> : null}
              {!loading && !selectedRun ? <div className={styles.fieldHint}>从左侧选择一条调试记录。</div> : null}
              {selectedRun ? (
                <div className={styles.stack}>
                  <div className={styles.resultBlock}>
                    <h3 className={styles.resultTitle}>基本信息</h3>
                    <pre className={styles.pre}>{JSON.stringify({
                      id: selectedRun.id,
                      compareGroupKey: selectedRun.compareGroupKey,
                      compareLabel: selectedRun.compareLabel,
                      executionMode: selectedRun.executionMode,
                      replaySourceRunId: selectedRun.replaySourceRunId ?? null,
                      createdAt: selectedRun.createdAt,
                      agentProfile: selectedRun.agentProfile,
                      subAgentProfile: selectedRun.subAgentProfile,
                    }, null, 2)}</pre>
                  </div>
                  {selectedRun.usage ? (
                    <div className={styles.resultBlock}>
                      <h3 className={styles.resultTitle}>Token / Cost</h3>
                      <div className={styles.summaryGrid}>
                        <div className={styles.summaryCard}><span>Prompt Tokens</span><strong>{selectedRun.usage.promptTokens}</strong></div>
                        <div className={styles.summaryCard}><span>Completion Tokens</span><strong>{selectedRun.usage.completionTokens}</strong></div>
                        <div className={styles.summaryCard}><span>Total Tokens</span><strong>{selectedRun.usage.totalTokens}</strong></div>
                        <div className={styles.summaryCard}>
                          <span>Cost</span>
                          <strong>
                            {selectedRun.usage.cost !== null
                              ? `${selectedRun.usage.currency ?? 'USD'} ${selectedRun.usage.cost.toFixed(4)}`
                              : `${selectedRun.usage.source === 'estimated' ? '未配置价格，仅估算 token' : '未返回价格'}`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {selectedRun.promptSnapshot ? (
                    <div className={styles.resultBlock}>
                      <h3 className={styles.resultTitle}>Prompt 快照</h3>
                      <div className={styles.compareStack}>
                        <details className={styles.jsonPreview}>
                          <summary className={styles.jsonPreviewSummary}>System Prompt</summary>
                          <pre className={styles.pre}>{selectedRun.promptSnapshot.systemPromptFinal}</pre>
                        </details>
                        <details className={styles.jsonPreview}>
                          <summary className={styles.jsonPreviewSummary}>Developer Prompt</summary>
                          <pre className={styles.pre}>{selectedRun.promptSnapshot.developerPromptFinal}</pre>
                        </details>
                        <details className={styles.jsonPreview}>
                          <summary className={styles.jsonPreviewSummary}>Messages Final</summary>
                          <pre className={styles.pre}>{JSON.stringify(selectedRun.promptSnapshot.messagesFinal, null, 2)}</pre>
                        </details>
                        <details className={styles.jsonPreview}>
                          <summary className={styles.jsonPreviewSummary}>Input Context Snapshot</summary>
                          <pre className={styles.pre}>{JSON.stringify(selectedRun.promptSnapshot.inputContextSnapshot, null, 2)}</pre>
                        </details>
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.resultBlock}>
                    <h3 className={styles.resultTitle}>最终提示词</h3>
                    <pre className={styles.pre}>{selectedRun.finalPrompt}</pre>
                  </div>
                  <div className={styles.resultBlock}>
                    <h3 className={styles.resultTitle}>原始输出</h3>
                    <pre className={styles.pre}>{selectedRun.rawText ?? '(empty)'}</pre>
                  </div>
                  <div className={styles.resultBlock}>
                    <h3 className={styles.resultTitle}>结构化输出包</h3>
                    <pre className={styles.pre}>{JSON.stringify(selectedRun.assistantPackage, null, 2)}</pre>
                  </div>
                  <div className={styles.linkRow}>
                    {selectedRun.subAgentProfile?.slug ? (
                      <Link href={`/internal/planner-debug/${encodeURIComponent(selectedRun.subAgentProfile.slug)}`}>返回该子 Agent 调试页</Link>
                    ) : null}
                    <Link href="/internal/planner-debug/compare">打开 A/B 对比页</Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
