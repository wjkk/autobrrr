import styles from './planner-page.module.css';
import type { PlannerOutlineDoc } from '../lib/planner-outline-doc';
import { sanitizePlannerOutlineDoc } from '../lib/planner-display-normalization';

interface PlannerOutlineViewProps {
  outline: PlannerOutlineDoc;
}

export function PlannerOutlineView({ outline }: PlannerOutlineViewProps) {
  const displayOutline = sanitizePlannerOutlineDoc(outline);

  return (
    <div className={styles.outlineDocument}>
      <section className={styles.docSection}>
        <h3 className={styles.sectionTitle}>基础信息</h3>
        <div className={styles.outlineMetaGrid}>
          <article className={styles.outlineMetaCard}>
            <span>剧集名称</span>
            <strong>{displayOutline.projectTitle}</strong>
          </article>
          <article className={styles.outlineMetaCard}>
            <span>题材风格</span>
            <strong>{displayOutline.genre}</strong>
          </article>
          <article className={styles.outlineMetaCard}>
            <span>剧集篇幅</span>
            <strong>{displayOutline.episodeCount} 集</strong>
          </article>
          <article className={styles.outlineMetaCard}>
            <span>内容形态</span>
            <strong>{displayOutline.format === 'series' ? '多剧集' : '单片'}</strong>
          </article>
        </div>
        <p className={styles.outlinePremise}>{displayOutline.premise}</p>
        {displayOutline.toneStyle.length > 0 ? (
          <div className={styles.docStepTags}>
            {displayOutline.toneStyle.map((item) => (
              <span key={item} className={styles.docStepTag}>
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.docSection}>
        <h3 className={styles.sectionTitle}>主要角色</h3>
        <div className={styles.outlineCharacterStack}>
          {displayOutline.mainCharacters.map((character) => (
            <article key={character.id} className={styles.outlineCharacterCard}>
              <header>
                <strong>{character.name}</strong>
                <span>{character.role}</span>
              </header>
              <p>{character.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.docSection}>
        <h3 className={styles.sectionTitle}>情节概要</h3>
        <div className={styles.outlineArcStack}>
          {displayOutline.storyArc.map((arc) => (
            <article key={`${arc.episodeNo}-${arc.title}`} className={styles.outlineArcCard}>
              <header>
                <strong>{`第${arc.episodeNo}集`}</strong>
                <span>{arc.title}</span>
              </header>
              <p>{arc.summary}</p>
            </article>
          ))}
        </div>
      </section>

      {displayOutline.constraints.length > 0 ? (
        <section className={styles.docSection}>
          <h3 className={styles.sectionTitle}>约束条件</h3>
          <ul>
            {displayOutline.constraints.map((item, index) => (
              <li key={`constraint-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {displayOutline.openQuestions.length > 0 ? (
        <section className={styles.docSection}>
          <h3 className={styles.sectionTitle}>待确认问题</h3>
          <ul>
            {displayOutline.openQuestions.map((item, index) => (
              <li key={`question-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
