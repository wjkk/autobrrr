'use client';

import type { CatalogStyleItem, CatalogSubjectItem } from '../lib/catalog-management-api';
import styles from './catalog-management-page.module.css';
import { CollectionCardMedia } from '../../shared/components/collection-card-media';
import { subjectTypeLabel, visibilityLabel } from './catalog-management-presenters';

export function CatalogCardGrid(props: {
  tab: 'subjects' | 'styles';
  selectedSubjectId: string | null;
  selectedStyleId: string | null;
  filteredSubjects: CatalogSubjectItem[];
  filteredStyles: CatalogStyleItem[];
  onSelectSubject: (item: CatalogSubjectItem) => void;
  onSelectStyle: (item: CatalogStyleItem) => void;
}) {
  return (
    <div className={`${styles.cardGrid} ${props.tab === 'subjects' ? styles.cardGridSubjects : styles.cardGridStyles}`}>
      {props.tab === 'subjects' ? (
        props.filteredSubjects.length > 0 ? props.filteredSubjects.map((item) => (
          <button key={item.id} type="button" className={`${styles.card} ${styles.cardSubject} ${props.selectedSubjectId === item.id ? styles.cardActive : ''}`} onClick={() => props.onSelectSubject(item)}>
            <CollectionCardMedia
              imageUrl={item.imageUrl}
              alt={item.name}
              aspectRatio="3 / 4"
              className={styles.cardMediaWrap}
              imageClassName={styles.cardMedia}
              fullBleed
              hoverScale="parent"
            />
            <div className={styles.cardTitleRow}>
              <span className={styles.cardName}>{item.name}</span>
              <span className={styles.cardSlug}>{item.slug}</span>
            </div>
            <div className={styles.cardMetaRow}>
              <span className={styles.cardMetaPill}>{visibilityLabel(item.visibility)}</span>
              <span className={styles.cardMetaPill}>{subjectTypeLabel(item.subjectType)}</span>
            </div>
          </button>
        )) : <div className={styles.emptyState}>当前筛选条件下没有主体，试试切换公共 / 个人或调整搜索词。</div>
      ) : (
        props.filteredStyles.length > 0 ? props.filteredStyles.map((item) => (
          <button key={item.id} type="button" className={`${styles.card} ${styles.cardStyle} ${props.selectedStyleId === item.id ? styles.cardActive : ''}`} onClick={() => props.onSelectStyle(item)}>
            <CollectionCardMedia
              imageUrl={item.imageUrl}
              alt={item.name}
              aspectRatio="1 / 0.96"
              className={styles.cardMediaWrap}
              imageClassName={styles.cardMedia}
              fullBleed
              hoverScale="parent"
            />
            <div className={styles.cardTitleRow}>
              <span className={styles.cardName}>{item.name}</span>
              <span className={styles.cardSlug}>{item.slug}</span>
            </div>
            <div className={styles.cardMetaRow}>
              <span className={styles.cardMetaPill}>{visibilityLabel(item.visibility)}</span>
            </div>
          </button>
        )) : <div className={styles.emptyState}>当前筛选条件下没有画风，试试切换公共 / 个人或调整搜索词。</div>
      )}
    </div>
  );
}
