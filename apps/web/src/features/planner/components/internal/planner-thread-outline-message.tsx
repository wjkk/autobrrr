import { sanitizePlannerOutlineDoc } from '../../lib/planner-display-normalization';
import styles from '../planner-page.module.css';

interface PlannerThreadOutlineMessageProps {
  messageId: string;
  outlineDoc: Record<string, unknown> | null;
}

export function PlannerThreadOutlineMessage({ messageId, outlineDoc }: PlannerThreadOutlineMessageProps) {
  const sanitizedOutlineDoc = outlineDoc
    ? sanitizePlannerOutlineDoc(outlineDoc as unknown as Parameters<typeof sanitizePlannerOutlineDoc>[0])
    : null;
  const storyArc =
    sanitizedOutlineDoc && Array.isArray(sanitizedOutlineDoc.storyArc)
      ? sanitizedOutlineDoc.storyArc
          .map((arc) => (arc && typeof arc === 'object' && !Array.isArray(arc) ? (arc as Record<string, unknown>) : null))
          .filter((arc): arc is Record<string, unknown> => arc !== null)
      : [];

  return (
    <article className={styles.outlineCard}>
      <h4>{typeof sanitizedOutlineDoc?.projectTitle === 'string' ? sanitizedOutlineDoc.projectTitle : '剧本大纲'}</h4>
      <section className={styles.outlineSection}>
        <h5>基础信息</h5>
        <ul>
          {typeof sanitizedOutlineDoc?.genre === 'string' ? <li>{`题材风格：${sanitizedOutlineDoc.genre}`}</li> : null}
          {typeof sanitizedOutlineDoc?.format === 'string' ? <li>{`内容形态：${sanitizedOutlineDoc.format === 'series' ? '多剧集' : '单片'}`}</li> : null}
          {typeof sanitizedOutlineDoc?.episodeCount === 'number' ? <li>{`剧集篇幅：${sanitizedOutlineDoc.episodeCount} 集`}</li> : null}
          {typeof sanitizedOutlineDoc?.premise === 'string' ? <li>{`剧情简介：${sanitizedOutlineDoc.premise}`}</li> : null}
        </ul>
      </section>
      {storyArc.length > 0 ? (
        <section className={styles.outlineSection}>
          <h5>情节概要</h5>
          <ul>
            {storyArc.map((arc, index) => {
              const episodeNo = typeof arc.episodeNo === 'number' ? `第${arc.episodeNo}集` : `第${index + 1}集`;
              const title = typeof arc.title === 'string' ? arc.title : '未命名';
              const summary = typeof arc.summary === 'string' ? arc.summary : '';
              return <li key={`${messageId}-arc-${index}`}>{`${episodeNo} ${title}：${summary}`}</li>;
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
