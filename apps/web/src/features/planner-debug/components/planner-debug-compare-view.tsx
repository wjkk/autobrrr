'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerDebugCompareResponse, PlannerDebugRunResponse } from '../lib/planner-agent-debug-types';
import {
  buildPlannerResultPreview,
  buildPlannerResultSummary,
  summarizePrompt,
  type PlannerPreviewCardItem,
} from '../lib/planner-debug-presenters';

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function readStepAnalysis(assistantPackage: unknown) {
  const rawSteps = Array.isArray(readObject(assistantPackage).stepAnalysis) ? (readObject(assistantPackage).stepAnalysis as unknown[]) : [];
  return rawSteps.map((item, index) => {
    const record = readObject(item);
    const details = Array.isArray(record.details) ? record.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0) : [];
    return {
      key: readString(record.id) || `step-${index + 1}`,
      title: readString(record.title) || `步骤 ${index + 1}`,
      status: readString(record.status) || 'done',
      details,
    };
  });
}

function stepDiffLabel(left: ReturnType<typeof readStepAnalysis>, right: ReturnType<typeof readStepAnalysis>) {
  const leftSummary = left.map((step) => `${step.title}:${step.status}`).join(' / ') || '-';
  const rightSummary = right.map((step) => `${step.title}:${step.status}`).join(' / ') || '-';
  return `步骤状态：A ${leftSummary}；B ${rightSummary}。`;
}

function renderStepDiffBlock(steps: ReturnType<typeof readStepAnalysis>) {
  if (!steps.length) {
    return <div className={styles.fieldHint}>当前结果没有返回 stepAnalysis。</div>;
  }

  return (
    <div className={styles.compareStack}>
      {steps.map((step) => (
        <div key={step.key} className={styles.summaryCard}>
          <span>{step.title}</span>
          <strong>{step.status}</strong>
          {step.details.length ? <span>{step.details.join(' / ')}</span> : null}
        </div>
      ))}
    </div>
  );
}

function outputFieldDiffLabel(left: string[], right: string[]) {
  const leftOnly = left.filter((item) => !right.includes(item));
  const rightOnly = right.filter((item) => !left.includes(item));
  if (!leftOnly.length && !rightOnly.length) {
    return '输出字段集合一致';
  }

  const segments: string[] = [];
  if (leftOnly.length) {
    segments.push(`A 独有：${leftOnly.join(', ')}`);
  }
  if (rightOnly.length) {
    segments.push(`B 独有：${rightOnly.join(', ')}`);
  }
  return segments.join('；');
}

function previewCoverage(items: PlannerPreviewCardItem[]) {
  return items.filter((item) => Boolean(item.imageUrl)).length;
}

function usageLabel(result: PlannerDebugRunResponse) {
  if (!result.usage) {
    return '未记录';
  }

  const costLabel =
    result.usage.cost !== null
      ? `${result.usage.currency ?? 'USD'} ${result.usage.cost.toFixed(4)}`
      : (result.usage.source === 'estimated' ? '仅估算 token' : '未返回价格');

  return `${result.usage.totalTokens} tokens · ${costLabel}`;
}

function renderPreviewSection(title: string, items: PlannerPreviewCardItem[]) {
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

function ResultColumn({
  label,
  result,
  runBasePath,
}: {
  label: string;
  result: PlannerDebugRunResponse;
  runBasePath: string;
}) {
  const summary = useMemo(() => buildPlannerResultSummary(result.assistantPackage), [result.assistantPackage]);
  const preview = useMemo(() => buildPlannerResultPreview(result.input, result.assistantPackage), [result.assistantPackage, result.input]);
  const promptStats = useMemo(() => summarizePrompt(result.finalPrompt), [result.finalPrompt]);
  const steps = useMemo(() => readStepAnalysis(result.assistantPackage), [result.assistantPackage]);

  return (
    <div className={styles.compareColumn}>
      <div className={styles.compareColumnHeader}>
        <div>
          <div className={styles.compareLabel}>{label}</div>
          <h4 className={styles.compareTitle}>{result.subAgentProfile.displayName}</h4>
          <p className={styles.compareHint}>
            {result.subAgentProfile.subtype} · {result.executionMode === 'live' ? '真实模型' : '回退生成'}
          </p>
        </div>
        <Link href={`${runBasePath}/${encodeURIComponent(result.debugRunId)}`} className={styles.inlineLinkPill}>
          打开完整回放
        </Link>
      </div>

      <div className={styles.compareStatsGrid}>
        <div className={styles.compareStatCard}><span>Prompt</span><strong>{promptStats.charCount} 字</strong></div>
        <div className={styles.compareStatCard}><span>输出字段</span><strong>{summary.outputKeys.length}</strong></div>
        <div className={styles.compareStatCard}><span>主体 / 场景 / 分镜</span><strong>{summary.subjectCount} / {summary.sceneCount} / {summary.shotCount}</strong></div>
        <div className={styles.compareStatCard}><span>完整度 / 步骤</span><strong>{summary.completenessScore}% / {summary.stepCount}</strong></div>
      </div>

      <div className={styles.compareBlock}>
        <h5 className={styles.resultTitle}>最终提示词</h5>
        <pre className={styles.pre}>{result.finalPrompt}</pre>
      </div>

      <div className={styles.compareBlock}>
        <h5 className={styles.resultTitle}>输出摘要</h5>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}><span>阶段</span><strong>{summary.stage}</strong></div>
          <div className={styles.summaryCard}><span>标题</span><strong>{summary.documentTitle}</strong></div>
          <div className={styles.summaryCard}><span>字段集合</span><strong>{summary.outputKeys.join(', ') || '-'}</strong></div>
          <div className={styles.summaryCard}><span>助手文案</span><strong>{summary.assistantMessage || '-'}</strong></div>
          <div className={styles.summaryCard}><span>步骤</span><strong>{summary.stepTitles.join(' / ') || '-'}</strong></div>
          <div className={styles.summaryCard}><span>Token / Cost</span><strong>{usageLabel(result)}</strong></div>
        </div>
        {summary.missingFields.length ? (
          <details className={styles.jsonPreview}>
            <summary className={styles.jsonPreviewSummary}>查看缺失字段</summary>
            <pre className={styles.pre}>{summary.missingFields.join('\n')}</pre>
          </details>
        ) : null}
        <details className={styles.jsonPreview}>
          <summary className={styles.jsonPreviewSummary}>Model Selection Snapshot</summary>
          <pre className={styles.pre}>{JSON.stringify(result.promptSnapshot?.modelSelectionSnapshot ?? {}, null, 2)}</pre>
        </details>
      </div>

      <div className={styles.compareBlock}>
        <h5 className={styles.resultTitle}>步骤差异明细</h5>
        {renderStepDiffBlock(steps)}
      </div>

      <div className={styles.compareBlock}>
        <h5 className={styles.resultTitle}>主图预览</h5>
        <div className={styles.previewSections}>
          {renderPreviewSection('主体', preview.subjects)}
          {renderPreviewSection('场景', preview.scenes)}
          {renderPreviewSection('分镜', preview.shots)}
          {!preview.subjects.length && !preview.scenes.length && !preview.shots.length ? <div className={styles.fieldHint}>当前结果没有可展示主图。</div> : null}
        </div>
      </div>
    </div>
  );
}

export function PlannerDebugCompareView({
  compareResult,
  chrome = 'default',
}: {
  compareResult: PlannerDebugCompareResponse;
  chrome?: 'default' | 'admin';
}) {
  const runBasePath = chrome === 'admin' ? '/admin/planner-debug/runs' : '/internal/planner-debug/runs';
  const leftSummary = useMemo(() => buildPlannerResultSummary(compareResult.left.assistantPackage), [compareResult.left.assistantPackage]);
  const rightSummary = useMemo(() => buildPlannerResultSummary(compareResult.right.assistantPackage), [compareResult.right.assistantPackage]);
  const leftPreview = useMemo(() => buildPlannerResultPreview(compareResult.left.input, compareResult.left.assistantPackage), [compareResult.left.assistantPackage, compareResult.left.input]);
  const rightPreview = useMemo(() => buildPlannerResultPreview(compareResult.right.input, compareResult.right.assistantPackage), [compareResult.right.assistantPackage, compareResult.right.input]);
  const leftPrompt = useMemo(() => summarizePrompt(compareResult.left.finalPrompt), [compareResult.left.finalPrompt]);
  const rightPrompt = useMemo(() => summarizePrompt(compareResult.right.finalPrompt), [compareResult.right.finalPrompt]);
  const leftSteps = useMemo(() => readStepAnalysis(compareResult.left.assistantPackage), [compareResult.left.assistantPackage]);
  const rightSteps = useMemo(() => readStepAnalysis(compareResult.right.assistantPackage), [compareResult.right.assistantPackage]);

  const diffItems = [
    `Prompt 长度差异：A ${leftPrompt.charCount} 字，B ${rightPrompt.charCount} 字。`,
    outputFieldDiffLabel(leftSummary.outputKeys, rightSummary.outputKeys),
    `步骤标题：A ${leftSummary.stepTitles.join(' / ') || '-'}；B ${rightSummary.stepTitles.join(' / ') || '-'}.`,
    stepDiffLabel(leftSteps, rightSteps),
    `结构化结果：A ${leftSummary.subjectCount}/${leftSummary.sceneCount}/${leftSummary.shotCount}，B ${rightSummary.subjectCount}/${rightSummary.sceneCount}/${rightSummary.shotCount}。`,
    `字段完整度：A ${leftSummary.completenessScore}%（缺 ${leftSummary.missingFields.length} 项），B ${rightSummary.completenessScore}%（缺 ${rightSummary.missingFields.length} 项）。`,
    `Token / Cost：A ${usageLabel(compareResult.left)}，B ${usageLabel(compareResult.right)}。`,
    `主图覆盖：A ${previewCoverage(leftPreview.subjects) + previewCoverage(leftPreview.scenes) + previewCoverage(leftPreview.shots)} 张，B ${previewCoverage(rightPreview.subjects) + previewCoverage(rightPreview.scenes) + previewCoverage(rightPreview.shots)} 张。`,
  ];

  return (
    <div className={styles.compareStack}>
      <div className={styles.resultBlock}>
        <h3 className={styles.resultTitle}>A/B 核心差异</h3>
        <div className={styles.compareHeadlineRow}>
          <span className={styles.topInfoPill}>Compare Group：{compareResult.compareGroupKey}</span>
          <span className={styles.topInfoPill}>A：{compareResult.left.subAgentProfile.displayName}</span>
          <span className={styles.topInfoPill}>B：{compareResult.right.subAgentProfile.displayName}</span>
        </div>
        <ul className={styles.diffList}>
          {diffItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className={styles.compareBoard}>
        <ResultColumn label="A" result={compareResult.left} runBasePath={runBasePath} />
        <ResultColumn label="B" result={compareResult.right} runBasePath={runBasePath} />
      </div>
    </div>
  );
}
