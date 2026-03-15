'use client';

import type {
  PlannerGenerationConfigEditorState,
  PlannerInputSchemaEditorState,
  PlannerOutputSchemaEditorState,
  PlannerToolPolicyEditorState,
} from '../lib/planner-agent-config-editor';
import type { PlannerStepDefinitionEditorItem } from '../lib/planner-agent-debug-types';
import { PlannerGenerationConfigEditor, PlannerInputSchemaEditor, PlannerOutputSchemaEditor, PlannerToolPolicyEditor } from './planner-agent-config-editors';
import styles from './planner-agent-debug-page.module.css';
import { PlannerStepDefinitionEditor } from './planner-step-definition-editor';

export function PlannerManageEditorPane(props: {
  selectedSubAgentEntry: boolean;
  saving: boolean;
  editorState: {
    displayName: string;
    status: 'draft' | 'active' | 'deprecated' | 'archived';
    description: string;
    systemPromptOverride: string;
    developerPromptOverride: string;
    stepDefinitions: PlannerStepDefinitionEditorItem[];
    inputSchema: PlannerInputSchemaEditorState;
    outputSchema: PlannerOutputSchemaEditorState;
    toolPolicy: PlannerToolPolicyEditorState;
    generationConfig: PlannerGenerationConfigEditorState;
  };
  onSaveDraft: () => void;
  onSaveAndRun: () => void;
  onEditorStateChange: (updater: (current: {
    displayName: string;
    status: 'draft' | 'active' | 'deprecated' | 'archived';
    description: string;
    systemPromptOverride: string;
    developerPromptOverride: string;
    stepDefinitions: PlannerStepDefinitionEditorItem[];
    inputSchema: PlannerInputSchemaEditorState;
    outputSchema: PlannerOutputSchemaEditorState;
    toolPolicy: PlannerToolPolicyEditorState;
    generationConfig: PlannerGenerationConfigEditorState;
  }) => {
    displayName: string;
    status: 'draft' | 'active' | 'deprecated' | 'archived';
    description: string;
    systemPromptOverride: string;
    developerPromptOverride: string;
    stepDefinitions: PlannerStepDefinitionEditorItem[];
    inputSchema: PlannerInputSchemaEditorState;
    outputSchema: PlannerOutputSchemaEditorState;
    toolPolicy: PlannerToolPolicyEditorState;
    generationConfig: PlannerGenerationConfigEditorState;
  }) => void;
  serializeStepDefinitions: (value: PlannerStepDefinitionEditorItem[]) => unknown;
  serializeInputSchema: (value: PlannerInputSchemaEditorState) => unknown;
  serializeOutputSchema: (value: PlannerOutputSchemaEditorState) => unknown;
  serializeToolPolicy: (value: PlannerToolPolicyEditorState) => unknown;
  serializeGenerationConfig: (value: PlannerGenerationConfigEditorState) => unknown;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>配置编辑</h2>
          <p className={styles.panelHint}>这里维护当前子 Agent 的草稿配置；主流程只读取已发布生效版本。</p>
        </div>
        <div className={styles.toolbar}>
          <button type="button" className={styles.buttonGhost} onClick={props.onSaveDraft} disabled={!props.selectedSubAgentEntry || props.saving}>
            {props.saving ? '保存中…' : '保存草稿'}
          </button>
          <button type="button" className={styles.button} onClick={props.onSaveAndRun} disabled={!props.selectedSubAgentEntry || props.saving}>
            {props.saving ? '保存中…' : '保存并试跑'}
          </button>
        </div>
      </div>
      <div className={styles.panelBody}>
        {props.selectedSubAgentEntry ? (
          <div className={styles.stack}>
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>显示名称</label>
                <input className={styles.input} value={props.editorState.displayName} onChange={(event) => props.onEditorStateChange((current) => ({ ...current, displayName: event.target.value }))} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>状态</label>
                <select className={styles.select} value={props.editorState.status} onChange={(event) => props.onEditorStateChange((current) => ({ ...current, status: event.target.value as typeof current.status }))}>
                  <option value="draft">草稿</option>
                  <option value="active">已生效</option>
                  <option value="deprecated">已弃用</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>说明</label>
              <textarea className={styles.textarea} value={props.editorState.description} onChange={(event) => props.onEditorStateChange((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>系统提示词覆盖</label>
              <textarea className={styles.textarea} value={props.editorState.systemPromptOverride} onChange={(event) => props.onEditorStateChange((current) => ({ ...current, systemPromptOverride: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>开发提示词覆盖</label>
              <textarea className={styles.textarea} value={props.editorState.developerPromptOverride} onChange={(event) => props.onEditorStateChange((current) => ({ ...current, developerPromptOverride: event.target.value }))} />
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>步骤定义</label>
                <span className={styles.fieldHint}>结构化编辑，保存时自动序列化为 JSON</span>
              </div>
              <PlannerStepDefinitionEditor value={props.editorState.stepDefinitions} onChange={(stepDefinitions) => props.onEditorStateChange((current) => ({ ...current, stepDefinitions }))} />
              <details className={styles.jsonPreview}>
                <summary className={styles.jsonPreviewSummary}>查看序列化结果</summary>
                <pre className={styles.pre}>{JSON.stringify(props.serializeStepDefinitions(props.editorState.stepDefinitions), null, 2)}</pre>
              </details>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>输入约束</label>
                <span className={styles.fieldHint}>运行时输入约束，按字段和限制拆开编辑</span>
              </div>
              <PlannerInputSchemaEditor value={props.editorState.inputSchema} onChange={(inputSchema) => props.onEditorStateChange((current) => ({ ...current, inputSchema }))} />
              <details className={styles.jsonPreview}>
                <summary className={styles.jsonPreviewSummary}>查看序列化结果</summary>
                <pre className={styles.pre}>{JSON.stringify(props.serializeInputSchema(props.editorState.inputSchema), null, 2)}</pre>
              </details>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>输出约束</label>
                <span className={styles.fieldHint}>区分大纲 / 细化阶段与 structured doc 字段</span>
              </div>
              <PlannerOutputSchemaEditor value={props.editorState.outputSchema} onChange={(outputSchema) => props.onEditorStateChange((current) => ({ ...current, outputSchema }))} />
              <details className={styles.jsonPreview}>
                <summary className={styles.jsonPreviewSummary}>查看序列化结果</summary>
                <pre className={styles.pre}>{JSON.stringify(props.serializeOutputSchema(props.editorState.outputSchema), null, 2)}</pre>
              </details>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>工具策略</label>
                <span className={styles.fieldHint}>控制阶段、局部重跑、资产上下文与安全约束</span>
              </div>
              <PlannerToolPolicyEditor value={props.editorState.toolPolicy} onChange={(toolPolicy) => props.onEditorStateChange((current) => ({ ...current, toolPolicy }))} />
              <details className={styles.jsonPreview}>
                <summary className={styles.jsonPreviewSummary}>查看序列化结果</summary>
                <pre className={styles.pre}>{JSON.stringify(props.serializeToolPolicy(props.editorState.toolPolicy), null, 2)}</pre>
              </details>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>生成参数</label>
                <span className={styles.fieldHint}>按阶段维护温度、输出长度、重试与质量闸门</span>
              </div>
              <PlannerGenerationConfigEditor value={props.editorState.generationConfig} onChange={(generationConfig) => props.onEditorStateChange((current) => ({ ...current, generationConfig }))} />
              <details className={styles.jsonPreview}>
                <summary className={styles.jsonPreviewSummary}>查看序列化结果</summary>
                <pre className={styles.pre}>{JSON.stringify(props.serializeGenerationConfig(props.editorState.generationConfig), null, 2)}</pre>
              </details>
            </div>
          </div>
        ) : (
          <div className={styles.fieldHint}>当前没有可编辑的子 Agent。</div>
        )}
      </div>
    </div>
  );
}
