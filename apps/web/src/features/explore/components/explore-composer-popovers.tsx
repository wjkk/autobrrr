'use client';

import { cx } from '@aiv/ui';

import { CHARACTER_OPTIONS, IMAGE_MODEL_OPTIONS, STYLE_OPTIONS } from './explore-page.data';
import styles from './explore-page.module.css';
import type { ExplorePopover } from './explore-page.types';

interface ExploreComposerPopoversProps {
  activePopover: Exclude<ExplorePopover, null>;
  selectedModel: string;
  selectedImageModel: string;
  onSelectModel: (model: string) => void;
  onSelectImageModel: (model: string) => void;
  onSelectCharacter: () => void;
  onAddCharacter: () => void;
}

export function ExploreComposerPopovers({
  activePopover,
  selectedModel,
  selectedImageModel,
  onSelectModel,
  onSelectImageModel,
  onSelectCharacter,
  onAddCharacter,
}: ExploreComposerPopoversProps) {
  return (
    <div className={styles.globalPopoverArea}>
      {activePopover === 'imageModel' && (
        <div className={styles.popoverMenu}>
          <div className={styles.popoverHeader}>主体图模型</div>
          <div className={styles.popoverGridCols5}>
            {IMAGE_MODEL_OPTIONS.map((model) => (
              <button
                key={model}
                className={cx(styles.popoverItem, selectedImageModel === model && styles.popoverItemActive)}
                onClick={() => onSelectImageModel(model)}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePopover === 'character' && (
        <div className={styles.popoverMenu}>
          <div className={styles.popoverHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ color: '#fff', cursor: 'pointer' }}>公共</span>
              <span style={{ cursor: 'pointer' }}>个人</span>
            </div>
            <span onClick={onAddCharacter} className={styles.textLink}>+ 添加新主体</span>
          </div>

          <div className={styles.popoverFilterBar}>
            <span className={styles.filterChipActive}>全部</span>
            <span className={styles.filterChip}>女性</span>
            <span className={styles.filterChip}>男性</span>
            <span className={styles.filterChip}>小孩</span>
          </div>

          <div className={styles.popoverGridCols4}>
            {CHARACTER_OPTIONS.map((character) => (
              <button key={character.name} className={styles.characterAvatarBtn} onClick={onSelectCharacter}>
                <img src={character.imageUrl} alt={character.name} className={styles.characterAvatarImg} />
                <span className={styles.characterName}>{character.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePopover === 'model' && (
        <div className={styles.popoverMenu}>
          <div className={styles.popoverHeader}>画风列表</div>
          <div className={styles.popoverGridCols5}>
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.name}
                className={cx(styles.styleCardBtn, selectedModel === style.name && styles.styleCardBtnActive)}
                onClick={() => onSelectModel(style.name)}
              >
                <div className={styles.styleCardImgWrapper}>
                  <img src={style.imageUrl} alt={style.name} />
                </div>
                <span>{style.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
