'use client';

import Link from 'next/link';

import type { PlannerDebugCompareResponse, PlannerDebugRunDetail, PlannerDebugRunListItem, PlannerSubAgentCatalogEntry } from '../lib/planner-agent-debug-types';
import { PlannerDebugCompareView } from './planner-debug-compare-view';
import styles from './planner-agent-debug-page.module.css';

export function PlannerDebugHistoryPane(props: {
  chrome: 'default' | 'admin';
  debugBasePath: string;
  debugRouteSearch?: string;
  subAgents: PlannerSubAgentCatalogEntry[];
  selectedSubAgentEntry: PlannerSubAgentCatalogEntry | null;
  compareSubAgentId: string;
  compareRunning: boolean;
  compareResult: PlannerDebugCompareResponse | null;
  recentRuns: PlannerDebugRunListItem[];
  loadingRun: boolean;
  selectedRun: PlannerDebugRunDetail | null;
  onCompareSubAgentIdChange: (value: string) => void;
  onCompare: () => void;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>回放与 A/B</h2>
          <p className={styles.panelHint}>最近调试历史、详情回放，以及同上下文 A/B 对比。</p>
        </div>
        <Link href={`${props.debugBasePath}/runs${props.debugRouteSearch ?? ''}`} className={styles.buttonGhost}>
          全部历史
        </Link>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.stack}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>A/B 对比对象</label>
            <select className={styles.select} value={props.compareSubAgentId} onChange={(event) => props.onCompareSubAgentIdChange(event.target.value)}>
              {props.subAgents.filter((item) => item.subAgent.id !== props.selectedSubAgentEntry?.subAgent.id).map(({ subAgent }) => (
                <option key={subAgent.id} value={subAgent.id}>
                  {subAgent.displayName} / {subAgent.subtype}
                </option>
              ))}
            </select>
            <button type="button" className={styles.button} onClick={props.onCompare} disabled={props.compareRunning || !props.selectedSubAgentEntry || !props.compareSubAgentId}>
              {props.compareRunning ? '对比中…' : '运行 A/B 对比'}
            </button>
          </div>
          {props.compareResult ? <PlannerDebugCompareView compareResult={props.compareResult} chrome={props.chrome} /> : null}
          <div className={styles.historyList}>
            {props.recentRuns.map((run) => (
              <button key={run.id} type="button" className={styles.historyRunItem} onClick={() => props.onSelectRun(run.id)}>
                <div className={styles.catalogTitle}>
                  <span>{run.compareLabel ? `${run.compareLabel} · ` : ''}{run.subAgentProfile?.displayName ?? '未知子 Agent'}</span>
                  <span className={styles.status}>{run.executionMode === 'live' ? '真实模型' : '回退生成'}</span>
                </div>
                <div className={styles.catalogMeta}>
                  <div>{new Date(run.createdAt).toLocaleString('zh-CN')}</div>
                  <div>{run.id}</div>
                </div>
              </button>
            ))}
            {!props.recentRuns.length ? <div className={styles.fieldHint}>当前子 Agent 还没有调试历史。</div> : null}
          </div>
          {props.loadingRun ? <div className={styles.fieldHint}>正在加载回放详情…</div> : null}
          {props.selectedRun ? (
            <div className={styles.resultBlock}>
              <h3 className={styles.resultTitle}>当前回放</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}><span>子 Agent</span><strong>{props.selectedRun.subAgentProfile?.displayName ?? '未知子 Agent'}</strong></div>
                <div className={styles.summaryCard}><span>运行方式</span><strong>{props.selectedRun.executionMode === 'live' ? '真实模型' : '回退生成'}</strong></div>
                <div className={styles.summaryCard}><span>创建时间</span><strong>{new Date(props.selectedRun.createdAt).toLocaleString('zh-CN')}</strong></div>
                <div className={styles.summaryCard}><span>A/B 标签</span><strong>{props.selectedRun.compareLabel ?? '-'}</strong></div>
              </div>
              {props.selectedRun.diffSummary?.length ? (
                <ul className={styles.diffList}>
                  {props.selectedRun.diffSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <div className={styles.linkRow}>
                <Link href={`${props.debugBasePath}/runs/${encodeURIComponent(props.selectedRun.id)}${props.debugRouteSearch ?? ''}`}>打开独立回放页</Link>
                {props.selectedRun.subAgentProfile?.slug ? (
                  <Link href={`${props.debugBasePath}/${encodeURIComponent(props.selectedRun.subAgentProfile.slug)}${props.debugRouteSearch ? `${props.debugRouteSearch}&replayRunId=${encodeURIComponent(props.selectedRun.id)}` : `?replayRunId=${encodeURIComponent(props.selectedRun.id)}`}`}>
                    用该回放结果回填调试表单
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
