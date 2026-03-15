'use client';

import type { CatalogVisibility } from '../lib/catalog-management-api';
import type { StyleDraft } from './catalog-management-editor-types';
import styles from './catalog-management-page.module.css';
import { Dialog } from '../../shared/components/dialog';
import { visibilityLabel } from './catalog-management-presenters';

export function CatalogStyleDialog(props: {
  open: boolean;
  draft: StyleDraft;
  saving: boolean;
  feedback: string;
  feedbackError: boolean;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDraftChange: (updater: (current: StyleDraft) => StyleDraft) => void;
}) {
  return (
    <Dialog
      open={props.open}
      title={props.draft.id ? `编辑画风：${props.draft.name || props.draft.slug}` : '创建画风'}
      description="在弹层里集中维护画风信息与 prompt 模板。"
      size="wide"
      onClose={props.onClose}
      footer={(
        <div className={styles.dialogFooter}>
          <div className={styles.dialogFooterInfo}>
            <div className={styles.dialogFooterTitle}>保存当前配置</div>
            <div className={`${styles.feedback} ${props.feedbackError ? styles.feedbackError : ''}`}>
              {props.feedback || '保存后会立即更新画风库卡片与 prompt 模板。'}
            </div>
          </div>
          <div className={styles.dialogFooterActions}>
            <button type="button" className={styles.ghostButton} onClick={props.onClear}>清空</button>
            <button type="button" className={styles.primaryButton} disabled={props.saving} onClick={props.onSave}>
              {props.saving ? '保存中...' : props.draft.id ? '保存画风' : '创建画风'}
            </button>
          </div>
        </div>
      )}
    >
      <div className={styles.dialogLayout}>
        <div className={styles.dialogPreviewColumn}>
          <div className={styles.previewHero}>
            <img src={props.draft.imageUrl || 'https://placehold.co/640x720/e5e7eb/111827?text=Style'} alt={props.draft.name || 'style'} className={styles.previewHeroImage} />
            <div className={styles.previewHeroMeta}>
              <span className={styles.previewPill}>{visibilityLabel(props.draft.visibility)}</span>
            </div>
          </div>
          <div className={styles.imageToolCard}>
            <div className={styles.imageModeTabs}>
              <button type="button" className={`${styles.imageModeTab} ${styles.imageModeTabActive}`}>风格封面</button>
            </div>
            <div className={styles.styleHelperCard}>
              <div className={styles.styleHelperTitle}>封面作用</div>
              <div className={styles.styleHelperText}>画风封面主要用于列表识别与风格气质传达。真正决定生成效果的仍然是描述、正向 prompt 与负向 prompt 模板。</div>
            </div>
          </div>
        </div>
        <div className={styles.dialogFormColumn}>
          <div className={styles.formGrid}>
            <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={props.draft.name} onChange={(event) => props.onDraftChange((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>Slug</label><input className={styles.input} value={props.draft.slug} onChange={(event) => props.onDraftChange((current) => ({ ...current, slug: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>可见性</label><select className={styles.select} value={props.draft.visibility} onChange={(event) => props.onDraftChange((current) => ({ ...current, visibility: event.target.value as CatalogVisibility }))}><option value="public">公共</option><option value="personal">个人</option></select></div>
            <div className={styles.field}><label className={styles.label}>排序</label><input className={styles.input} type="number" value={props.draft.sortOrder} onChange={(event) => props.onDraftChange((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>封面图 URL</label><input className={styles.input} value={props.draft.imageUrl} onChange={(event) => props.onDraftChange((current) => ({ ...current, imageUrl: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>描述</label><textarea className={styles.textarea} value={props.draft.description} onChange={(event) => props.onDraftChange((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>正向 Prompt 模板</label><textarea className={styles.textarea} value={props.draft.promptTemplate} onChange={(event) => props.onDraftChange((current) => ({ ...current, promptTemplate: event.target.value }))} /></div>
            <div className={styles.fieldFull}><label className={styles.label}>负向 Prompt 模板</label><textarea className={styles.textarea} value={props.draft.negativePrompt} onChange={(event) => props.onDraftChange((current) => ({ ...current, negativePrompt: event.target.value }))} /></div>
            <div className={styles.field}><label className={styles.label}>标签</label><input className={styles.input} value={props.draft.tags} onChange={(event) => props.onDraftChange((current) => ({ ...current, tags: event.target.value }))} placeholder="国风, 水墨, 留白" /></div>
            <div className={styles.field}><label className={styles.label}>启用状态</label><div className={styles.checkboxRow}><input type="checkbox" checked={props.draft.enabled} onChange={(event) => props.onDraftChange((current) => ({ ...current, enabled: event.target.checked }))} /><span className={styles.hint}>关闭后首页不会显示该画风</span></div></div>
            <div className={styles.fieldFull}><label className={styles.label}>扩展 Metadata(JSON)</label><textarea className={styles.textarea} value={props.draft.metadata} onChange={(event) => props.onDraftChange((current) => ({ ...current, metadata: event.target.value }))} placeholder='{"recommendedModelFamily":"seko-image"}' /></div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
