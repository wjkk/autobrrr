'use client';

import Image from 'next/image';

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
              <div className={styles.cardImageWrapper}>
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  sizes="(max-width: 1200px) 50vw, 33vw"
                  className={styles.cardRealImg}
                />
                <div className={styles.cardAdOverlay} />
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
              <div className={styles.cardImageWrapper}>
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  sizes="(max-width: 1200px) 50vw, 33vw"
                  className={styles.cardRealImg}
                />
                <div className={styles.cardHoverOverlay}>
                  <div className={styles.hoverTopPlay}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div className={styles.hoverBottomActions}>
                    <div className={styles.hoverCopy}>
                      <span className={styles.hoverTag}>{card.category}</span>
                      <span className={styles.hoverTitle}>{card.title}</span>
                      <span className={styles.hoverMetric}>{card.metric}</span>
                    </div>
                    <button type="button" className={styles.cloneStyleBtn}>同款创作</button>
                  </div>
                </div>
                <div className={styles.cardStatsBar}>
                  <div className={styles.authorInfo}>
                    <span className={styles.phantomAvatar} />
                    <div className={styles.authorMeta}>
                      <strong>{card.author}</strong>
                      <span>{card.accent}</span>
                    </div>
                  </div>
                  <button type="button" className={styles.likeBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>{card.likeCount}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
