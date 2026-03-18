'use client';

import type { DebugFormState } from '../lib/planner-debug-runtime';
import type { PlannerDebugRunResponse, PlannerSubAgentCatalogEntry } from '../lib/planner-agent-debug-types';
import { PlannerDebugResultView } from './planner-debug-result-view';
import styles from './planner-agent-debug-page.module.css';

export function PlannerDebugRunPane(props: {
  chrome: 'default' | 'admin';
  debugBasePath: string;
  debugRouteSearch?: string;
  selectedSubAgentEntry: PlannerSubAgentCatalogEntry | null;
  running: boolean;
  debugForm: DebugFormState;
  debugResult: PlannerDebugRunResponse | null;
  onRun: () => void;
  onApply?: () => void;
  applying?: boolean;
  onDebugFormChange: (updater: (current: DebugFormState) => DebugFormState) => void;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>调试运行</h2>
          <p className={styles.panelHint}>默认只做独立试跑；确认结果后，可手动应用到主流程工作区。</p>
        </div>
        <div className={styles.headerActions}>
          {props.debugResult ? (
            <button type="button" className={styles.buttonGhost} onClick={props.onApply} disabled={!props.onApply || props.applying}>
              {props.applying ? '应用中…' : '应用到主流程'}
            </button>
          ) : null}
          <button type="button" className={styles.button} onClick={props.onRun} disabled={props.running || !props.selectedSubAgentEntry}>
            {props.running ? '运行中…' : '运行调试'}
          </button>
        </div>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.stack}>
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>项目 ID</label>
              <input className={styles.input} value={props.debugForm.projectId} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, projectId: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>集 ID</label>
              <input className={styles.input} value={props.debugForm.episodeId} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, episodeId: event.target.value }))} />
            </div>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>项目标题</label>
              <input className={styles.input} value={props.debugForm.projectTitle} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, projectTitle: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>集标题</label>
              <input className={styles.input} value={props.debugForm.episodeTitle} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, episodeTitle: event.target.value }))} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>用户需求</label>
            <textarea className={styles.textarea} value={props.debugForm.userPrompt} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, userPrompt: event.target.value }))} />
          </div>
          <div className={styles.threeCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>配置来源</label>
              <select className={styles.select} value={props.debugForm.configSource} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, configSource: event.target.value === 'published' ? 'published' : 'draft' }))}>
                <option value="draft">未发布草稿试跑</option>
                <option value="published">已发布配置试跑</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>目标阶段</label>
              <select className={styles.select} value={props.debugForm.targetStage} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, targetStage: event.target.value === 'outline' ? 'outline' : 'refinement', partialRerunScope: event.target.value === 'outline' ? 'none' : current.partialRerunScope }))}>
                <option value="outline">大纲阶段</option>
                <option value="refinement">细化阶段</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>局部重跑范围</label>
              <select className={styles.select} value={props.debugForm.partialRerunScope} disabled={props.debugForm.targetStage !== 'refinement'} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, partialRerunScope: event.target.value as DebugFormState['partialRerunScope'] }))}>
                <option value="none">整体验证</option>
                <option value="subject_only">仅主体</option>
                <option value="scene_only">仅场景</option>
                <option value="shots_only">仅分镜</option>
              </select>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>剧本原文</label>
            <textarea className={styles.textarea} value={props.debugForm.scriptContent} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, scriptContent: event.target.value }))} />
          </div>
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>主体</label>
              <input className={styles.input} value={props.debugForm.selectedSubjectName} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, selectedSubjectName: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>画风</label>
              <input className={styles.input} value={props.debugForm.selectedStyleName} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, selectedStyleName: event.target.value }))} />
            </div>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>主体图模型</label>
              <input className={styles.input} value={props.debugForm.selectedImageModelLabel} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, selectedImageModelLabel: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>文本模型族</label>
              <input className={styles.input} value={props.debugForm.modelFamily} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, modelFamily: event.target.value }))} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>文本模型端点</label>
            <input className={styles.input} placeholder="可留空，默认按模型族自动解析" value={props.debugForm.modelEndpoint} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, modelEndpoint: event.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>历史消息快照</label>
            <textarea className={styles.textarea} placeholder='[{\"role\":\"user\",\"text\":\"上一轮需求\"}]' value={props.debugForm.priorMessagesJson} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, priorMessagesJson: event.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>当前大纲快照</label>
            <textarea className={styles.textarea} placeholder='{\"projectTitle\":\"...\",\"storyArc\":[...]}' value={props.debugForm.currentOutlineDocJson} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, currentOutlineDocJson: event.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>当前细化文档快照</label>
            <textarea className={styles.textarea} placeholder='{\"subjects\":[...],\"scenes\":[...],\"acts\":[...]}' value={props.debugForm.currentStructuredDocJson} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, currentStructuredDocJson: event.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>目标实体快照</label>
            <textarea className={styles.textarea} placeholder='{\"id\":\"...\",\"name\":\"目标主体\"}' value={props.debugForm.targetEntityJson} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, targetEntityJson: event.target.value }))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>策划素材快照</label>
            <textarea className={styles.textarea} placeholder='[{\"id\":\"asset-1\",\"sourceUrl\":\"https://...\"}]' value={props.debugForm.plannerAssetsJson} onChange={(event) => props.onDebugFormChange((current) => ({ ...current, plannerAssetsJson: event.target.value }))} />
          </div>
          {props.debugResult ? (
            <PlannerDebugResultView
              debugResult={props.debugResult}
              chrome={props.chrome}
              debugRouteSearch={props.debugRouteSearch}
              onApply={props.onApply}
              applying={props.applying}
              replayHref={`${props.debugBasePath}/runs/${encodeURIComponent(props.debugResult.debugRunId)}${props.debugRouteSearch ?? ''}`}
              refillHref={
                props.selectedSubAgentEntry
                  ? `${props.debugBasePath}/${encodeURIComponent(props.selectedSubAgentEntry.subAgent.slug)}${props.debugRouteSearch ? `${props.debugRouteSearch}&replayRunId=${encodeURIComponent(props.debugResult.debugRunId)}` : `?replayRunId=${encodeURIComponent(props.debugResult.debugRunId)}`}`
                  : null
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
