'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import styles from './collection-toolbar.module.css';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function CollectionToolbar(props: { children: ReactNode }) {
  return <section className={styles.toolbar}>{props.children}</section>;
}

export function CollectionToolbarGroup(props: {
  children: ReactNode;
  align?: 'start' | 'end';
  nowrap?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        styles.group,
        props.align === 'end' && styles.groupEnd,
        props.nowrap && styles.groupNowrap,
      )}
    >
      {props.children}
    </div>
  );
}

export function CollectionToolbarChips(props: { children: ReactNode }) {
  return <div className={styles.chips}>{props.children}</div>;
}

export function CollectionToolbarPill(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    activeTone?: 'dark' | 'warm';
    inactiveStyle?: 'plain' | 'outlined';
  },
) {
  const { active = false, activeTone = 'dark', inactiveStyle = 'plain', className, type, ...rest } = props;

  return (
    <button
      {...rest}
      type={type ?? 'button'}
      className={joinClasses(
        styles.pill,
        !active && inactiveStyle === 'outlined' && styles.pillOutlined,
        active && activeTone === 'dark' && styles.pillActiveDark,
        active && activeTone === 'warm' && styles.pillActiveWarm,
        className,
      )}
    />
  );
}

export function CollectionToolbarSearch(
  props: InputHTMLAttributes<HTMLInputElement> & {
    width?: number;
  },
) {
  const { width = 320, className, ...rest } = props;

  return (
    <div className={styles.searchWrap} style={{ width, flexBasis: width }}>
      <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-3.5-3.5"></path>
      </svg>
      <input {...rest} className={joinClasses(styles.searchInput, className)} />
    </div>
  );
}

export function CollectionToolbarSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    width?: number;
  },
) {
  const { width = 156, className, children, ...rest } = props;
  return (
    <div className={styles.selectWrap} style={{ width, flexBasis: width }}>
      <select {...rest} className={joinClasses(styles.select, className)}>
        {children}
      </select>
      <svg className={styles.selectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </div>
  );
}

export function CollectionToolbarAction(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, type, ...rest } = props;
  return <button {...rest} type={type ?? 'button'} className={joinClasses(styles.action, className)} />;
}

export function CollectionToolbarMeta(props: { children: ReactNode }) {
  return <div className={styles.meta}>{props.children}</div>;
}
