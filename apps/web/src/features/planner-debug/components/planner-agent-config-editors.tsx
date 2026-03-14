'use client';

import styles from './planner-agent-debug-page.module.css';

import type {
  PlannerGenerationConfigEditorState,
  PlannerInputSchemaEditorState,
  PlannerOutputSchemaEditorState,
  PlannerToolPolicyEditorState,
} from '../lib/planner-agent-config-editor';
import { parseLineList, toLineList } from '../lib/planner-agent-config-editor';

function ToggleRow(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
    </label>
  );
}

export function PlannerInputSchemaEditor(props: {
  value: PlannerInputSchemaEditorState;
  onChange: (nextValue: PlannerInputSchemaEditorState) => void;
}) {
  const { value, onChange } = props;
  return (
    <div className={styles.stack}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>必填字段</label>
          <textarea className={styles.textarea} value={toLineList(value.required)} onChange={(event) => onChange({ ...value, required: parseLineList(event.target.value) })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>可选字段</label>
          <textarea className={styles.textarea} value={toLineList(value.optional)} onChange={(event) => onChange({ ...value, optional: parseLineList(event.target.value) })} />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Language</label>
          <input className={styles.input} value={value.language} onChange={(event) => onChange({ ...value, language: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>可用阶段</label>
          <textarea className={styles.textarea} value={toLineList(value.stages)} onChange={(event) => onChange({ ...value, stages: parseLineList(event.target.value) })} />
        </div>
      </div>

      <div className={styles.threeCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>用户需求最大长度</label>
          <input className={styles.input} value={value.userPromptMaxLength} onChange={(event) => onChange({ ...value, userPromptMaxLength: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>历史消息最大条数</label>
          <input className={styles.input} value={value.priorMessagesMaxLength} onChange={(event) => onChange({ ...value, priorMessagesMaxLength: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>策划素材最大数量</label>
          <input className={styles.input} value={value.plannerAssetsMaxLength} onChange={(event) => onChange({ ...value, plannerAssetsMaxLength: event.target.value })} />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>局部重跑范围</label>
        <textarea className={styles.textarea} value={toLineList(value.partialRerunScopes)} onChange={(event) => onChange({ ...value, partialRerunScopes: parseLineList(event.target.value) })} />
      </div>
    </div>
  );
}

export function PlannerOutputSchemaEditor(props: {
  value: PlannerOutputSchemaEditorState;
  onChange: (nextValue: PlannerOutputSchemaEditorState) => void;
}) {
  const { value, onChange } = props;
  return (
    <div className={styles.stack}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>大纲阶段必填</label>
          <textarea className={styles.textarea} value={toLineList(value.outlineRequired)} onChange={(event) => onChange({ ...value, outlineRequired: parseLineList(event.target.value) })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>细化阶段必填</label>
          <textarea className={styles.textarea} value={toLineList(value.refinementRequired)} onChange={(event) => onChange({ ...value, refinementRequired: parseLineList(event.target.value) })} />
        </div>
      </div>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>文档核心字段</label>
          <textarea className={styles.textarea} value={toLineList(value.structuredDocRequired)} onChange={(event) => onChange({ ...value, structuredDocRequired: parseLineList(event.target.value) })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>分镜字段</label>
          <textarea className={styles.textarea} value={toLineList(value.shotFields)} onChange={(event) => onChange({ ...value, shotFields: parseLineList(event.target.value) })} />
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>规则</label>
        <textarea className={styles.textarea} value={toLineList(value.rules)} onChange={(event) => onChange({ ...value, rules: parseLineList(event.target.value) })} />
      </div>
    </div>
  );
}

export function PlannerToolPolicyEditor(props: {
  value: PlannerToolPolicyEditorState;
  onChange: (nextValue: PlannerToolPolicyEditorState) => void;
}) {
  const { value, onChange } = props;
  return (
    <div className={styles.stack}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>模式</label>
          <input className={styles.input} value={value.mode} onChange={(event) => onChange({ ...value, mode: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>重点</label>
          <input className={styles.input} value={value.emphasis} onChange={(event) => onChange({ ...value, emphasis: event.target.value })} />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>允许阶段</label>
          <textarea className={styles.textarea} value={toLineList(value.allowedStages)} onChange={(event) => onChange({ ...value, allowedStages: parseLineList(event.target.value) })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>局部重跑范围</label>
          <textarea className={styles.textarea} value={toLineList(value.partialRerunScopes)} onChange={(event) => onChange({ ...value, partialRerunScopes: parseLineList(event.target.value) })} />
        </div>
      </div>

      <div className={styles.toggleGrid}>
        <ToggleRow label="允许主体素材规划" checked={value.allowSubjectAssetPlanning} onChange={(checked) => onChange({ ...value, allowSubjectAssetPlanning: checked })} />
        <ToggleRow label="允许场景素材规划" checked={value.allowSceneAssetPlanning} onChange={(checked) => onChange({ ...value, allowSceneAssetPlanning: checked })} />
        <ToggleRow label="允许重写文档" checked={value.allowDocumentRewrite} onChange={(checked) => onChange({ ...value, allowDocumentRewrite: checked })} />
        <ToggleRow label="允许生成分镜" checked={value.allowStoryboardGeneration} onChange={(checked) => onChange({ ...value, allowStoryboardGeneration: checked })} />
        <ToggleRow label="要求结构化文档" checked={value.requireStructuredDoc} onChange={(checked) => onChange({ ...value, requireStructuredDoc: checked })} />
        <ToggleRow label="允许使用策划素材上下文" checked={value.allowPlannerAssetContext} onChange={(checked) => onChange({ ...value, allowPlannerAssetContext: checked })} />
        <ToggleRow label="主图优先使用生成素材" checked={value.preferGeneratedAssetAsPrimary} onChange={(checked) => onChange({ ...value, preferGeneratedAssetAsPrimary: checked })} />
        <ToggleRow label="允许绑定参考图" checked={value.allowReferenceAssetBinding} onChange={(checked) => onChange({ ...value, allowReferenceAssetBinding: checked })} />
        <ToggleRow label="允许生成草图" checked={value.allowImageDraftGeneration} onChange={(checked) => onChange({ ...value, allowImageDraftGeneration: checked })} />
        <ToggleRow label="局部重跑保留无关实体" checked={value.preserveUnrelatedEntitiesDuringPartialRerun} onChange={(checked) => onChange({ ...value, preserveUnrelatedEntitiesDuringPartialRerun: checked })} />
        <ToggleRow label="要求输出结构化 JSON" checked={value.requireStructuredJsonOutput} onChange={(checked) => onChange({ ...value, requireStructuredJsonOutput: checked })} />
        <ToggleRow label="细化阶段必须输出步骤分析" checked={value.requireStepAnalysisOnRefinement} onChange={(checked) => onChange({ ...value, requireStepAnalysisOnRefinement: checked })} />
      </div>
    </div>
  );
}

export function PlannerGenerationConfigEditor(props: {
  value: PlannerGenerationConfigEditorState;
  onChange: (nextValue: PlannerGenerationConfigEditorState) => void;
}) {
  const { value, onChange } = props;
  return (
    <div className={styles.stack}>
      <div className={styles.configSectionTitle}>大纲阶段</div>
      <div className={styles.threeCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>温度</label>
          <input className={styles.input} value={value.outlineTemperature} onChange={(event) => onChange({ ...value, outlineTemperature: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最大输出 Tokens</label>
          <input className={styles.input} value={value.outlineMaxOutputTokens} onChange={(event) => onChange({ ...value, outlineMaxOutputTokens: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Top P</label>
          <input className={styles.input} value={value.outlineTopP} onChange={(event) => onChange({ ...value, outlineTopP: event.target.value })} />
        </div>
      </div>

      <div className={styles.configSectionTitle}>细化阶段</div>
      <div className={styles.threeCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>温度</label>
          <input className={styles.input} value={value.refinementTemperature} onChange={(event) => onChange({ ...value, refinementTemperature: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最大输出 Tokens</label>
          <input className={styles.input} value={value.refinementMaxOutputTokens} onChange={(event) => onChange({ ...value, refinementMaxOutputTokens: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Top P</label>
          <input className={styles.input} value={value.refinementTopP} onChange={(event) => onChange({ ...value, refinementTopP: event.target.value })} />
        </div>
      </div>

      <div className={styles.threeCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>响应格式</label>
          <input className={styles.input} value={value.responseFormat} onChange={(event) => onChange({ ...value, responseFormat: event.target.value })} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最大重试次数</label>
          <input className={styles.input} value={value.retryMaxAttempts} onChange={(event) => onChange({ ...value, retryMaxAttempts: event.target.value })} />
        </div>
        <ToggleRow label="允许回退" checked={value.allowFallback} onChange={(checked) => onChange({ ...value, allowFallback: checked })} />
      </div>

      <div className={styles.toggleGrid}>
        <ToggleRow label="要求文档标题" checked={value.requireDocumentTitle} onChange={(checked) => onChange({ ...value, requireDocumentTitle: checked })} />
        <ToggleRow label="要求 operations 块" checked={value.requireOperationsBlock} onChange={(checked) => onChange({ ...value, requireOperationsBlock: checked })} />
        <ToggleRow label="要求主体/场景提示词" checked={value.requireEntityPrompts} onChange={(checked) => onChange({ ...value, requireEntityPrompts: checked })} />
      </div>
    </div>
  );
}
