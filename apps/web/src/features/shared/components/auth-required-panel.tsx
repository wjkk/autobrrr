'use client';

import type { ReactNode } from 'react';

import styles from './auth-required-panel.module.css';

export function AuthRequiredPanel(props: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          {props.eyebrow ? <div className={styles.eyebrow}>{props.eyebrow}</div> : null}
          <h1 className={styles.title}>{props.title}</h1>
          <p className={styles.subtitle}>{props.description}</p>
        </div>
      </section>
      {props.children ? <div className={styles.body}>{props.children}</div> : null}
    </div>
  );
}
