'use client';

import { cx } from '@aiv/ui';

import { INSPIRATION_CARDS } from './explore-page.data';
import styles from './explore-page.module.css';

interface ExploreInspirationSquareProps {
  onPublish: () => void;
}

export function ExploreInspirationSquare({ onPublish }: ExploreInspirationSquareProps) {
  return (
    <div className={styles.inspirationSquareSection}>
      <div className={styles.squareHeader}>
        <h2 className={styles.squareTitle}>灵感广场</h2>
        <button className={styles.squarePublishBtn} onClick={onPublish}>+ 发布作品</button>
      </div>

      <div className={styles.masonryGrid}>
        {INSPIRATION_CARDS.map((card) => (
          <div key={card.id} className={styles.masonryCard} style={{ gridRowEnd: `span ${card.rowSpan}` }}>
            {card.type === 'ad' ? (
              <div className={cx(styles.cardImage, styles[card.imageClass])}>
                <div className={styles.adContentMock}>
                  <h3>{card.brand}</h3>
                  <h2>
                    {card.title}
                    <span className={styles.newBadge}>New</span>
                  </h2>
                  <p>{card.summary}</p>
                </div>
                <div className={styles.sliderDots}>
                  <span className={styles.dotActive}></span>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                </div>
              </div>
            ) : (
              <>
                <div className={cx(styles.cardImage, styles[card.imageClass])} />
                <div className={styles.cardOverlay}>
                  <button className={styles.likeBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>{card.likeCount}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
