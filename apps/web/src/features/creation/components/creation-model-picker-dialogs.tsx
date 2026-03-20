'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationModalShell } from './creation-modal-shell';
import dialogStyles from './creation-dialogs.module.css';
import styles from './creation-page.module.css';

const MODEL_OPTIONS = [
  {
    id: 'Vision Auto',
    category: 'auto' as const,
    title: 'Vision Auto',
    description: '默认推荐，适合保持角色和场景的一致稳定。',
    tags: ['推荐', '稳定'],
  },
  {
    id: 'Vision Detail',
    category: 'detail' as const,
    title: 'Vision Detail',
    description: '强调服装、表情与材质细节，适合角色近景和高质感镜头。',
    tags: ['细节', '高保真'],
  },
  {
    id: 'Vision Reference',
    category: 'reference' as const,
    title: 'Vision Reference',
    description: '更依赖参考图和已有版本，适合局部重做与一致性修补。',
    tags: ['参考图', '一致性'],
  },
];

export function CreationModelPickerDialogs(props: {
  controller: CreationWorkspaceController;
}) {
  const { controller } = props;
  const { dialog, activeShot, modelPickerDraft } = controller;

  if (!activeShot || (dialog.type !== 'model-picker' && dialog.type !== 'confirm-model-reset')) {
    return null;
  }

  const modelOptions = controller.availableModelOptions.length
    ? controller.availableModelOptions
    : MODEL_OPTIONS.filter((item) => item.category === modelPickerDraft.category);

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'model-picker'}
        eyebrow="Model Picker"
        title="模型选择器"
        description="保持我们自己的视觉层，但把结构做成 Creation 工作台内部的专用模型面板。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.footerNote}>若与当前模型不同，确认后会进入“重置并重新生成”的确认步骤。</span>}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={controller.applyModelPicker}>
              应用模型
            </button>
          </>
        }
      >
        {!controller.availableModelOptions.length ? (
          <div className={dialogStyles.modelCategoryTabs}>
            {([
              ['auto', '自动推荐'],
              ['detail', '细节强化'],
              ['reference', '参考一致'],
            ] as const).map(([category, label]) => (
              <button
                key={category}
                type="button"
                className={modelPickerDraft.category === category ? styles.segmentedButtonActive : styles.segmentedButton}
                onClick={() => controller.setModelPickerField('category', category)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={dialogStyles.modelGrid}>
          {modelOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(dialogStyles.modelCard, modelPickerDraft.selectedModel === item.id && dialogStyles.modelCardActive)}
              onClick={() => {
                controller.setModelPickerField('selectedModel', item.id);
                if ('category' in item) {
                  controller.setModelPickerField('category', item.category);
                }
              }}
            >
              <div className={dialogStyles.modelHead}>
                <strong>{item.title}</strong>
                {modelPickerDraft.selectedModel === item.id ? <CreationIcon name="magic" className={styles.buttonGlyph} /> : null}
              </div>
              <p>{item.description}</p>
              {'tags' in item ? (
                <div className={dialogStyles.modelTags}>
                  {item.tags.map((tag) => (
                    <span key={tag} className={dialogStyles.modelTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'confirm-model-reset'}
        title="模型发生变更"
        description="模型发生变更，将为你重新生成主体图和场景图"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={() => dialog.type === 'confirm-model-reset' && controller.confirmModelChange(dialog.nextModel)}>
              确定
            </button>
          </>
        }
      >
        <div className={dialogStyles.warningCard}>
          <strong>{`${controller.resolveModelDisplayName(activeShot.preferredModel)} -> ${dialog.type === 'confirm-model-reset' ? controller.resolveModelDisplayName(dialog.nextModel) : ''}`}</strong>
          <p>确认后会将主体图和场景图回退到待生成状态，并按新模型重新生成。</p>
        </div>
      </CreationModalShell>
    </>
  );
}
