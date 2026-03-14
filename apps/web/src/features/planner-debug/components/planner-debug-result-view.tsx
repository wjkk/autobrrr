'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerDebugRunResponse } from '../lib/planner-agent-debug-types';
import { buildPlannerResultPreview } from '../lib/planner-debug-presenters';

function renderPreviewSection(title: string, items: Array<{ key: string; title: string; prompt: string; imageUrl: string | null }>) {
  if (!items.length) {
    return null;
  }

  return (
    <section>
      <div className={styles.previewSectionTitle}>{title}</div>
      <div className={styles.previewGrid}>
        {items.map((item) => (
          <article key={item.key} className={styles.previewCard}>
            <div className={styles.previewImageFrame}>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className={styles.previewImage} /> : <div className={styles.previewPlaceholder}>无图</div>}
            </div>
            <div className={styles.previewCardTitle}>{item.title}</div>
            <div className={styles.previewCardMeta}>{item.prompt || '无可展示描述'}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PlannerDebugResultView(props: {
  debugResult: PlannerDebugRunResponse;
  replayHref?: string | null;
  refillHref?: string | null;
}) {
  const preview = useMemo(
    () => buildPlannerResultPreview(props.debugResult.input, props.debugResult.assistantPackage),
    [props.debugResult.assistantPackage, props.debugResult.input],
  );

  return (
    <>
      <div className={styles.resultBlock}>
        <h3 className={styles.resultTitle}>运行信息</h3>
        <pre className={styles.pre}>{JSON.stringify({
          debugRunId: props.debugResult.debugRunId,
          executionMode: props.debugResult.executionMode,
          configSource: props.debugResult.configSource,
          releaseVersion: props.debugResult.releaseVersion,
          agentProfile: props.debugResult.agentProfile,
          subAgentProfile: props.debugResult.subAgentProfile,
          model: props.debugResult.model,
        }, null, 2)}</pre>
      </div>

      <div className={styles.linkRow}>
        {props.replayHref ? <Link href={props.replayHref}>打开本次回放页</Link> : null}
        <Link href="/internal/planner-debug/compare">打开 A/B 对比页</Link>
        {props.refillHref ? <Link href={props.refillHref}>用本次结果回填调试表单</Link> : null}
      </div>

      {props.debugResult.diffSummary?.length ? (
        <div className={styles.resultBlock}>
          <h3 className={styles.resultTitle}>变更摘要</h3>
          <ul className={styles.diffList}>
            {props.debugResult.diffSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.resultBlock}>
        <h3 className={styles.resultTitle}>最终提示词</h3>
        <pre className={styles.pre}>{props.debugResult.finalPrompt}</pre>
      </div>

      <div className={styles.resultBlock}>
        <h3 className={styles.resultTitle}>原始输出</h3>
        <pre className={styles.pre}>{props.debugResult.rawText ?? '(empty)'}</pre>
      </div>

      <div className={styles.resultBlock}>
        <h3 className={styles.resultTitle}>结构化输出包</h3>
        <pre className={styles.pre}>{JSON.stringify(props.debugResult.assistantPackage, null, 2)}</pre>
      </div>

      {(preview.subjects.length || preview.scenes.length || preview.shots.length) ? (
        <div className={styles.resultBlock}>
          <h3 className={styles.resultTitle}>主图预览</h3>
          <div className={styles.previewSections}>
            {renderPreviewSection('主体', preview.subjects)}
            {renderPreviewSection('场景', preview.scenes)}
            {renderPreviewSection('分镜', preview.shots)}
          </div>
        </div>
      ) : null}
    </>
  );
}
