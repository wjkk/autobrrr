'use client';

import { PlannerSubAgentBrowser } from './planner-sub-agent-browser';
import styles from './planner-agent-debug-page.module.css';
import type {
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
} from '../lib/planner-agent-debug-types';

export function PlannerManageSidebar(props: {
  chrome: 'default' | 'admin';
  loading: boolean;
  entries: PlannerSubAgentCatalogEntry[];
  selectedSubAgentId: string | null;
  onSelect: (subAgentId: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  contentTypeFilter: string;
  onContentTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  availableContentTypes: string[];
  selectedRelease: PlannerSubAgentReleaseItem | null;
  releases: PlannerSubAgentReleaseItem[];
  selectedReleaseId: string;
  onSelectedReleaseIdChange: (value: string) => void;
  currentConfigSummary: {
    displayName: string;
    stepCount: number;
    systemPromptLength: number;
    inputRequiredCount: number;
    enabledPolicyFlags: number;
  };
  selectedReleaseSummary: {
    stepCount: number;
    systemPromptLength: number;
    inputRequiredCount: number;
    enabledPolicyFlags: number;
  } | null;
  releaseCompare: {
    sections: Array<{ label: string; changed: boolean; detail: string }>;
  } | null;
  editorStatusLabel: string;
  onApplyRelease: () => void;
}) {
  return (
    <div className={styles.sidebarStack}>
      <PlannerSubAgentBrowser
        mode="manage"
        chrome={props.chrome}
        loading={props.loading}
        entries={props.entries}
        selectedSubAgentId={props.selectedSubAgentId}
        onSelect={props.onSelect}
        searchTerm={props.searchTerm}
        onSearchTermChange={props.onSearchTermChange}
        contentTypeFilter={props.contentTypeFilter}
        onContentTypeFilterChange={props.onContentTypeFilterChange}
        statusFilter={props.statusFilter}
        onStatusFilterChange={props.onStatusFilterChange}
        availableContentTypes={props.availableContentTypes}
      />

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>草稿与发布快照</h2>
            <p className={styles.panelHint}>对照当前编辑器与已发布版本，也可以把某个发布快照回填成新的草稿起点。</p>
          </div>
        </div>
        <div className={`${styles.panelBody} ${styles.compactPanelBody}`}>
          {props.selectedRelease ? (
            <div className={styles.compactStack}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>对比版本</label>
                <select className={styles.select} value={props.selectedReleaseId} onChange={(event) => props.onSelectedReleaseIdChange(event.target.value)}>
                  {props.releases.map((release) => (
                    <option key={release.id} value={release.id}>
                      v{release.releaseVersion} · {new Date(release.publishedAt).toLocaleString('zh-CN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.compareBoard}>
                <div className={styles.compareColumn}>
                  <div className={styles.compareColumnHeader}>
                    <div>
                      <div className={styles.compareLabel}>草稿</div>
                      <h4 className={styles.compareTitle}>{props.currentConfigSummary.displayName}</h4>
                    </div>
                    <span className={styles.inlineMutedPill}>{props.editorStatusLabel}</span>
                  </div>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}><span>步骤</span><strong>{props.currentConfigSummary.stepCount}</strong></div>
                    <div className={styles.summaryCard}><span>系统提示词</span><strong>{props.currentConfigSummary.systemPromptLength} 字</strong></div>
                    <div className={styles.summaryCard}><span>输入约束</span><strong>{props.currentConfigSummary.inputRequiredCount} 项</strong></div>
                    <div className={styles.summaryCard}><span>策略开关</span><strong>{props.currentConfigSummary.enabledPolicyFlags}</strong></div>
                  </div>
                </div>

                <div className={styles.compareColumn}>
                  <div className={styles.compareColumnHeader}>
                    <div>
                      <div className={styles.compareLabel}>发布快照</div>
                      <h4 className={styles.compareTitle}>v{props.selectedRelease.releaseVersion}</h4>
                      <p className={styles.compareHint}>{new Date(props.selectedRelease.publishedAt).toLocaleString('zh-CN')}</p>
                    </div>
                    <button type="button" className={styles.buttonGhost} onClick={props.onApplyRelease}>
                      作为新草稿起点
                    </button>
                  </div>
                  {props.selectedReleaseSummary ? (
                    <div className={styles.summaryGrid}>
                      <div className={styles.summaryCard}><span>步骤</span><strong>{props.selectedReleaseSummary.stepCount}</strong></div>
                      <div className={styles.summaryCard}><span>系统提示词</span><strong>{props.selectedReleaseSummary.systemPromptLength} 字</strong></div>
                      <div className={styles.summaryCard}><span>输入约束</span><strong>{props.selectedReleaseSummary.inputRequiredCount} 项</strong></div>
                      <div className={styles.summaryCard}><span>策略开关</span><strong>{props.selectedReleaseSummary.enabledPolicyFlags}</strong></div>
                    </div>
                  ) : null}
                </div>
              </div>

              {props.releaseCompare ? (
                <div className={styles.resultBlock}>
                  <h3 className={styles.resultTitle}>差异摘要</h3>
                  <ul className={styles.diffList}>
                    {props.releaseCompare.sections.map((item) => (
                      <li key={item.label}>
                        {item.label}：{item.changed ? '有变化' : '一致'}，{item.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.fieldHint}>当前还没有已发布快照，先发布一次后再做并排对照。</div>
          )}
        </div>
      </div>
    </div>
  );
}
