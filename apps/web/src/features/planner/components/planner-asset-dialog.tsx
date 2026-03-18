'use client';

import { cx } from '@aiv/ui';
import type { ReactNode } from 'react';

import type { ApiPlannerEntityRecommendation } from '../lib/planner-api';
import styles from './planner-page.module.css';

interface PlannerAssetDialogThumb {
  key: string;
  image: string;
  assetId: string | null;
  label: string;
}

interface PlannerAssetDialogProps {
  open: boolean;
  dialogTitle: string;
  previewAlt: string;
  previewImage: string;
  cardName: string;
  categoryLabel: string;
  categoryMode: 'subject' | 'scene';
  promptLabel: string;
  promptPlaceholder: string;
  promptValue: string;
  promptMode: 'upload' | 'ai';
  promptSendAriaLabel: string;
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  selectedAssetLabel: string;
  thumbs: PlannerAssetDialogThumb[];
  selectedAssetId: string | null;
  selectedImage: string;
  uploadSlot?: ReactNode;
  extraField?: ReactNode;
  recommendations?: ApiPlannerEntityRecommendation[];
  recommendationsLoading?: boolean;
  onClose: () => void;
  onSelectThumb: (thumb: PlannerAssetDialogThumb) => void;
  onPromptChange: (value: string) => void;
  onPromptModeChange: (mode: 'upload' | 'ai') => void;
  onApplyRecommendation?: (recommendation: ApiPlannerEntityRecommendation) => void;
  onGenerate: () => void;
  onRerun?: () => void;
  onApply: () => void;
}

export function PlannerAssetDialog(props: PlannerAssetDialogProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className={styles.assetModalBackdrop} role="presentation" onClick={props.onClose}>
      <section className={styles.assetModal} role="dialog" aria-modal="true" aria-label={props.dialogTitle} onClick={(event) => event.stopPropagation()}>
        <header className={styles.assetModalHeader}>
          <h3>{props.dialogTitle}</h3>
          <button type="button" className={styles.assetModalClose} onClick={props.onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.assetModalBody}>
          <div className={styles.assetPreviewPane}>
            <img src={props.previewImage} alt={props.previewAlt} />
            <div className={styles.assetThumbRow}>
              {props.thumbs.map((thumb) => (
                <button
                  key={thumb.key}
                  type="button"
                  className={cx(
                    styles.assetThumbButton,
                    thumb.assetId
                      ? props.selectedAssetId === thumb.assetId && styles.assetThumbButtonActive
                      : !props.selectedAssetId && props.selectedImage === thumb.image && styles.assetThumbButtonActive,
                  )}
                  onClick={() => props.onSelectThumb(thumb)}
                  title={thumb.label}
                >
                  <img src={thumb.image} alt={thumb.label} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.assetFormPane}>
            <label className={styles.assetField}>
              <span>名称</span>
              <input value={props.cardName} readOnly disabled />
            </label>

            <div className={styles.assetField}>
              <span>类别</span>
              <div className={styles.assetSegmentDisabled}>
                <span className={props.categoryMode === 'subject' ? styles.assetSegmentActive : undefined}>角色</span>
                <span className={props.categoryMode === 'scene' ? styles.assetSegmentActive : undefined}>场景</span>
              </div>
            </div>

            {props.extraField}

            <div className={styles.assetField}>
              <span>{props.promptLabel}</span>
              <div className={styles.assetModeSwitch}>
                <button type="button" className={cx(styles.assetModeButton, props.promptMode === 'upload' && styles.assetModeButtonActive)} onClick={() => props.onPromptModeChange('upload')}>
                  本地上传
                </button>
                <button type="button" className={cx(styles.assetModeButton, props.promptMode === 'ai' && styles.assetModeButtonActive)} onClick={() => props.onPromptModeChange('ai')}>
                  AI生成
                </button>
              </div>
              <div className={styles.assetPromptBox}>
                <textarea
                  value={props.promptValue}
                  placeholder={props.promptPlaceholder}
                  onChange={(event) => props.onPromptChange(event.target.value)}
                />
                <button
                  type="button"
                  className={styles.assetPromptSend}
                  onClick={props.onGenerate}
                  aria-label={props.promptSendAriaLabel}
                  disabled={!props.runtimeEnabled || !props.promptValue.trim() || props.plannerSubmitting}
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4.5 7.427 8 4.072m0 0 3.5 3.355M8 4.072v7.855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {props.promptMode === 'upload' ? props.uploadSlot : null}
            </div>

            {props.runtimeEnabled ? (
              <div className={styles.assetField}>
                <span>推荐方案</span>
                <div className={styles.assetRecommendationList}>
                  {props.recommendationsLoading ? (
                    <div className={styles.assetRecommendationEmpty}>正在生成推荐...</div>
                  ) : props.recommendations?.length ? (
                    props.recommendations.map((recommendation) => {
                      const previewAsset = recommendation.referenceAssets.find((asset) => Boolean(asset.sourceUrl)) ?? null;
                      return (
                        <article key={recommendation.id} className={styles.assetRecommendationCard}>
                          <div className={styles.assetRecommendationHeader}>
                            <div>
                              <strong>{recommendation.title}</strong>
                              <small>{recommendation.rationale}</small>
                            </div>
                            <button
                              type="button"
                              className={styles.assetRecommendationApply}
                              onClick={() => props.onApplyRecommendation?.(recommendation)}
                            >
                              应用推荐
                            </button>
                          </div>
                          <p>{recommendation.prompt}</p>
                          <div className={styles.assetRecommendationMeta}>
                            <span>{recommendation.referenceAssets.length > 0 ? `参考素材 ${recommendation.referenceAssets.length} 张` : '无需参考图也可直接生成'}</span>
                            {previewAsset?.sourceUrl ? (
                              <img src={previewAsset.sourceUrl} alt={previewAsset.fileName || recommendation.title} />
                            ) : null}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className={styles.assetRecommendationEmpty}>当前实体暂时没有可用推荐。</div>
                  )}
                </div>
              </div>
            ) : null}

            <footer className={styles.assetModalFooter}>
              <span>{props.selectedAssetLabel}</span>
              <div className={styles.assetModalActions}>
                {props.runtimeEnabled && props.onRerun ? (
                  <button type="button" className={styles.assetSecondaryButton} onClick={props.onRerun}>
                    AI重写设定
                  </button>
                ) : null}
                <button type="button" className={styles.assetGhostButton} onClick={props.onClose}>
                  取消
                </button>
                <button type="button" className={styles.assetPrimaryButton} onClick={props.onApply}>
                  应用
                </button>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
