import styles from '../planner-page.module.css';

interface PlannerDocumentMediaCardProps {
  title: string;
  image: string;
  prompt: string | null;
  metaClassName: string;
  onOpen: () => void;
}

export function PlannerDocumentMediaCard(props: PlannerDocumentMediaCardProps) {
  const { title, image, prompt, metaClassName, onOpen } = props;

  return (
    <article className={metaClassName === styles.subjectCardMeta ? styles.subjectCard : styles.sceneThumbCard} onClick={onOpen} role="button" tabIndex={0}>
      <button
        type="button"
        className={styles.cardHoverIconButton}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        aria-label={`调整 ${title}`}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path stroke="currentColor" strokeWidth="1.25" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
          <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
        </svg>
      </button>
      <img src={image} alt={prompt || title} loading="lazy" />
      <div className={metaClassName}>
        <strong>{title}</strong>
      </div>
    </article>
  );
}
