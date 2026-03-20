'use client';

import type { Dispatch, SetStateAction } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';

import type {
  PlannerDebugCompareResponse,
  PlannerDebugRunDetail,
  PlannerDebugRunListItem,
  PlannerDebugRunResponse,
  PlannerSubAgentCatalogEntry,
  PlannerSubAgentReleaseItem,
} from '../lib/planner-agent-debug-types';
import type { DebugFormState } from '../lib/planner-debug-runtime';
import type { EditableSubAgentState } from '../lib/planner-agent-debug-page-helpers';
import { serializeGenerationConfig, serializeInputSchema, serializeOutputSchema, serializeToolPolicy } from '../lib/planner-agent-config-editor';
import { serializeStepDefinitions, statusLabel } from '../lib/planner-agent-debug-page-helpers';

import styles from './planner-agent-debug-page.module.css';
import { PlannerDebugHistoryPane } from './planner-debug-history-pane';
import { PlannerDebugRunPane } from './planner-debug-run-pane';
import { PlannerManageEditorPane } from './planner-manage-editor-pane';
import { PlannerManageSidebar } from './planner-manage-sidebar';
import { PlannerSubAgentBrowser } from './planner-sub-agent-browser';
import { PlannerPageHero } from './planner-page-hero';
import { PlannerPageToolbar } from './planner-page-toolbar';

interface PlannerAgentDebugPageContentProps {
  chrome: 'default' | 'admin';
  mode: 'debug' | 'manage';
  debugBasePath: string;
  debugRouteSearch: string;
  loading: boolean;
  publishing: boolean;
  selectedSubAgentEntry: PlannerSubAgentCatalogEntry | null;
  releases: PlannerSubAgentReleaseItem[];
  filteredSubAgents: PlannerSubAgentCatalogEntry[];
  selectedSubAgentId: string | null;
  searchTerm: string;
  contentTypeFilter: string;
  statusFilter: string;
  availableContentTypes: string[];
  selectedRelease: PlannerSubAgentReleaseItem | null;
  selectedReleaseId: string;
  currentConfigSummary: ReturnType<typeof import('../lib/planner-agent-debug-page-helpers').summarizeEditableState>;
  selectedReleaseSummary: ReturnType<typeof import('../lib/planner-agent-debug-page-helpers').summarizeEditableState> | null;
  releaseCompare: ReturnType<typeof import('../lib/planner-agent-debug-page-helpers').buildReleaseDiffItems> | null;
  editorState: EditableSubAgentState;
  saving: boolean;
  running: boolean;
  applying: boolean;
  compareSubAgentId: string;
  compareRunning: boolean;
  compareResult: PlannerDebugCompareResponse | null;
  recentRuns: PlannerDebugRunListItem[];
  loadingRun: boolean;
  selectedRun: PlannerDebugRunDetail | null;
  debugForm: DebugFormState;
  debugResult: PlannerDebugRunResponse | null;
  message: { kind: 'ok' | 'warn' | 'error'; text: string } | null;
  onPublish: () => void;
  onSelectSubAgentId: (value: string | null) => void;
  onSearchTermChange: (value: string) => void;
  onContentTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectedReleaseIdChange: (value: string) => void;
  onApplyRelease: () => void;
  onSaveDraft: () => void;
  onSaveAndRun: () => void;
  onEditorStateChange: Dispatch<SetStateAction<EditableSubAgentState>>;
  onApplyCurrentDebugRun: () => void;
  onRun: () => void;
  onDebugFormChange: Dispatch<SetStateAction<DebugFormState>>;
  onCompareSubAgentIdChange: (value: string) => void;
  onCompare: () => void;
  onSelectRun: (runId: string) => void;
}

export function PlannerAgentDebugPageContent(props: PlannerAgentDebugPageContentProps) {
  const {
    chrome,
    mode,
    debugBasePath,
    debugRouteSearch,
    loading,
    publishing,
    selectedSubAgentEntry,
    releases,
    filteredSubAgents,
    selectedSubAgentId,
    searchTerm,
    contentTypeFilter,
    statusFilter,
    availableContentTypes,
    selectedRelease,
    selectedReleaseId,
    currentConfigSummary,
    selectedReleaseSummary,
    releaseCompare,
    editorState,
    saving,
    running,
    applying,
    compareSubAgentId,
    compareRunning,
    compareResult,
    recentRuns,
    loadingRun,
    selectedRun,
    debugForm,
    debugResult,
    message,
    onPublish,
    onSelectSubAgentId,
    onSearchTermChange,
    onContentTypeFilterChange,
    onStatusFilterChange,
    onSelectedReleaseIdChange,
    onApplyRelease,
    onSaveDraft,
    onSaveAndRun,
    onEditorStateChange,
    onApplyCurrentDebugRun,
    onRun,
    onDebugFormChange,
    onCompareSubAgentIdChange,
    onCompare,
    onSelectRun,
  } = props;

  const content = (
    <div className={chrome === 'admin' ? styles.adminShell : styles.shell}>
      <PlannerPageHero mode={mode} />

      {message ? (
        <div className={`${styles.message} ${message.kind === 'ok' ? styles.messageOk : message.kind === 'warn' ? styles.messageWarn : styles.messageError}`}>
          {message.text}
        </div>
      ) : null}

      <PlannerPageToolbar
        mode={mode}
        debugBasePath={debugBasePath}
        debugRouteSearch={debugRouteSearch}
        selectedEntry={
          selectedSubAgentEntry
            ? {
                contentType: selectedSubAgentEntry.profile.contentType,
                subtype: selectedSubAgentEntry.subAgent.subtype,
                status: statusLabel(selectedSubAgentEntry.subAgent.status),
                slug: selectedSubAgentEntry.subAgent.slug,
              }
            : null
        }
        releaseLabel={mode === 'manage' ? (releases.length ? `发布 v${releases[0]?.releaseVersion}` : '暂无快照') : null}
        publishing={publishing}
        onPublish={onPublish}
      />

      <section className={`${styles.grid} ${mode === 'manage' ? styles.manageGrid : mode === 'debug' ? styles.debugGrid : ''}`}>
        {mode === 'manage' ? (
          <PlannerManageSidebar
            chrome={chrome}
            loading={loading}
            entries={filteredSubAgents}
            selectedSubAgentId={selectedSubAgentId}
            onSelect={onSelectSubAgentId}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={onContentTypeFilterChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            availableContentTypes={availableContentTypes}
            selectedRelease={selectedRelease}
            releases={releases}
            selectedReleaseId={selectedReleaseId}
            onSelectedReleaseIdChange={onSelectedReleaseIdChange}
            currentConfigSummary={currentConfigSummary}
            selectedReleaseSummary={selectedReleaseSummary}
            releaseCompare={releaseCompare}
            editorStatusLabel={statusLabel(editorState.status)}
            onApplyRelease={onApplyRelease}
          />
        ) : (
          <PlannerSubAgentBrowser
            mode={mode}
            chrome={chrome}
            debugRouteSearch={debugRouteSearch}
            loading={loading}
            entries={filteredSubAgents}
            selectedSubAgentId={selectedSubAgentId}
            onSelect={onSelectSubAgentId}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={onContentTypeFilterChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            availableContentTypes={availableContentTypes}
          />
        )}
        {mode === 'manage' ? (
          <PlannerManageEditorPane
            selectedSubAgentEntry={Boolean(selectedSubAgentEntry)}
            saving={saving}
            editorState={editorState}
            onSaveDraft={onSaveDraft}
            onSaveAndRun={onSaveAndRun}
            onEditorStateChange={onEditorStateChange}
            serializeStepDefinitions={serializeStepDefinitions}
            serializeInputSchema={serializeInputSchema}
            serializeOutputSchema={serializeOutputSchema}
            serializeToolPolicy={serializeToolPolicy}
            serializeGenerationConfig={serializeGenerationConfig}
          />
        ) : (
          <div className={styles.sidebarStack}>
            <PlannerDebugRunPane
              chrome={chrome}
              debugBasePath={debugBasePath}
              debugRouteSearch={debugRouteSearch}
              selectedSubAgentEntry={selectedSubAgentEntry}
              running={running}
              debugForm={debugForm}
              debugResult={debugResult}
              onApply={onApplyCurrentDebugRun}
              applying={applying}
              onRun={onRun}
              onDebugFormChange={onDebugFormChange}
            />
            <PlannerDebugHistoryPane
              chrome={chrome}
              debugBasePath={debugBasePath}
              debugRouteSearch={debugRouteSearch}
              subAgents={filteredSubAgents}
              selectedSubAgentEntry={selectedSubAgentEntry}
              compareSubAgentId={compareSubAgentId}
              compareRunning={compareRunning}
              compareResult={compareResult}
              recentRuns={recentRuns}
              loadingRun={loadingRun}
              selectedRun={selectedRun}
              onCompareSubAgentIdChange={onCompareSubAgentIdChange}
              onCompare={onCompare}
              onSelectRun={onSelectRun}
            />
          </div>
        )}
      </section>
    </div>
  );

  if (chrome === 'admin') {
    return (
      <AdminShell pageTitle={mode === 'manage' ? 'Agent 管理' : 'Agent 调试'} active="planner">
        {content}
      </AdminShell>
    );
  }

  return <div className={styles.page}>{content}</div>;
}
