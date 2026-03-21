import { cx } from '@aiv/ui';

import { DOC_TOC } from '../../lib/planner-page-helpers';
import styles from '../planner-page.module.css';

export function PlannerDocumentToc() {
  return (
    <aside className={styles.tocRail} aria-label="文档目录">
      <ul className={styles.tocMiniList}>
        {DOC_TOC.map((item, index) => (
          <li key={`mini-${item.id}`}>
            <a href={`#${item.id}`} className={cx(styles.tocMiniItem, index === 0 && styles.tocMiniItemActive)} aria-label={item.title}>
              <span className={styles.tocMiniLine} />
            </a>
          </li>
        ))}
      </ul>

      <nav className={styles.tocPopover}>
        {DOC_TOC.map((item, index) => (
          <a key={item.id} href={`#${item.id}`} className={cx(styles.tocItem, index === 0 && styles.tocItemActive)}>
            <span className={styles.tocLine} />
            <span className={styles.tocText}>{item.title}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
