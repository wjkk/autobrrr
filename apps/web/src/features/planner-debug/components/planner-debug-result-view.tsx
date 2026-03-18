'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerDebugRunResponse } from '../lib/planner-agent-debug-types';
import { buildPlannerEntityDebugView, buildPlannerResultPreview } from '../lib/planner-debug-presenters';

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

function renderEntityLayer(title: string, items: Array<{ key: string; title: string; prompt: string; bindings: string[] }>) {
  return (
    <section>
      <div className={styles.previewSectionTitle}>{title}</div>
      {items.length ? (
        <div className={styles.compareStack}>
          {items.map((item) => (
            <div key={item.key} className={styles.summaryCard}>
              <span>{item.title}</span>
              <strong>{item.prompt || '无描述'}</strong>
              {item.bindings.length ? <span>绑定主体：{item.bindings.join(', ')}</span> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.fieldHint}>当前层没有相关实体。</div>
      )}
    </section>
  );
}

export function PlannerDebugResultView(props: {
  debugResult: PlannerDebugRunResponse;
  replayHref?: string | null;
  refillHref?: string | null;
  debugRouteSearch?: string;
  onApply?: () => void;
  applying?: boolean;
  chrome?: 'default' | 'admin';
}) {
  const compareHref = `${props.chrome === 'admin' ? '/admin/planner-debug/compare' : '/internal/planner-debug/compare'}${props.debugRouteSearch ?? ''}`;
  const preview = useMemo(
    () => buildPlannerResultPreview(props.debugResult.input, props.debugResult.assistantPackage),
    [props.debugResult.assistantPackage, props.debugResult.input],
  );
  const entityView = useMemo(
    () => buildPlannerEntityDebugView(props.debugResult.input, props.debugResult.assistantPackage),
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
        <Link href={compareHref}>打开 A/B 对比页</Link>
        {props.refillHref ? <Link href={props.refillHref}>用本次结果回填调试表单</Link> : null}
        {props.onApply ? (
          <button type="button" className={styles.buttonGhost} onClick={props.onApply} disabled={props.applying}>
            {props.applying ? '应用中…' : '应用到主流程'}
          </button>
        ) : null}
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
        <h3 className={styles.resultTitle}>实体纠偏视图</h3>
        <ul className={styles.diffList}>
          {entityView.corrections.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className={styles.compareBoard}>
          <div className={styles.compareColumn}>
            <div className={styles.compareColumnHeader}>
              <div>
                <div className={styles.compareLabel}>Raw</div>
                <h4 className={styles.compareTitle}>模型原始候选</h4>
              </div>
            </div>
            <div className={styles.compareBlock}>
              {renderEntityLayer('主体', entityView.raw.subjects)}
              {renderEntityLayer('场景', entityView.raw.scenes)}
              {renderEntityLayer('分镜', entityView.raw.shots)}
            </div>
          </div>

          <div className={styles.compareColumn}>
            <div className={styles.compareColumnHeader}>
              <div>
                <div className={styles.compareLabel}>Normalized</div>
                <h4 className={styles.compareTitle}>归一化结果</h4>
              </div>
            </div>
            <div className={styles.compareBlock}>
              {renderEntityLayer('主体', entityView.normalized.subjects)}
              {renderEntityLayer('场景', entityView.normalized.scenes)}
              {renderEntityLayer('分镜', entityView.normalized.shots)}
            </div>
          </div>

          <div className={styles.compareColumn}>
            <div className={styles.compareColumnHeader}>
              <div>
                <div className={styles.compareLabel}>Final</div>
                <h4 className={styles.compareTitle}>最终应用结果</h4>
              </div>
            </div>
            <div className={styles.compareBlock}>
              {renderEntityLayer('主体', entityView.final.subjects)}
              {renderEntityLayer('场景', entityView.final.scenes)}
              {renderEntityLayer('分镜', entityView.final.shots)}
            </div>
          </div>
        </div>
      </div>

      {props.debugResult.usage ? (
        <div className={styles.resultBlock}>
          <h3 className={styles.resultTitle}>Token / Cost</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span>Prompt Tokens</span><strong>{props.debugResult.usage.promptTokens}</strong></div>
            <div className={styles.summaryCard}><span>Completion Tokens</span><strong>{props.debugResult.usage.completionTokens}</strong></div>
            <div className={styles.summaryCard}><span>Total Tokens</span><strong>{props.debugResult.usage.totalTokens}</strong></div>
            <div className={styles.summaryCard}>
              <span>Cost</span>
              <strong>
                {props.debugResult.usage.cost !== null
                  ? `${props.debugResult.usage.currency ?? 'USD'} ${props.debugResult.usage.cost.toFixed(4)}`
                  : `${props.debugResult.usage.source === 'estimated' ? '未配置价格，仅估算 token' : '未返回价格'}`}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      {props.debugResult.promptSnapshot ? (
        <div className={styles.resultBlock}>
          <h3 className={styles.resultTitle}>Prompt 快照</h3>
          <div className={styles.compareStack}>
            <details className={styles.jsonPreview}>
              <summary className={styles.jsonPreviewSummary}>System Prompt</summary>
              <pre className={styles.pre}>{props.debugResult.promptSnapshot.systemPromptFinal}</pre>
            </details>
            <details className={styles.jsonPreview}>
              <summary className={styles.jsonPreviewSummary}>Developer Prompt</summary>
              <pre className={styles.pre}>{props.debugResult.promptSnapshot.developerPromptFinal}</pre>
            </details>
            <details className={styles.jsonPreview}>
              <summary className={styles.jsonPreviewSummary}>Messages Final</summary>
              <pre className={styles.pre}>{JSON.stringify(props.debugResult.promptSnapshot.messagesFinal, null, 2)}</pre>
            </details>
            <details className={styles.jsonPreview}>
              <summary className={styles.jsonPreviewSummary}>Model Selection Snapshot</summary>
              <pre className={styles.pre}>{JSON.stringify(props.debugResult.promptSnapshot.modelSelectionSnapshot ?? {}, null, 2)}</pre>
            </details>
            <details className={styles.jsonPreview}>
              <summary className={styles.jsonPreviewSummary}>Input Context Snapshot</summary>
              <pre className={styles.pre}>{JSON.stringify(props.debugResult.promptSnapshot.inputContextSnapshot, null, 2)}</pre>
            </details>
          </div>
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
