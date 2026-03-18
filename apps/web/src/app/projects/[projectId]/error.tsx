'use client';

import Link from 'next/link';

import styles from './error.module.css';

interface ProjectWorkspaceErrorProps {
  error: Error;
  reset: () => void;
}

export default function ProjectWorkspaceError({ error, reset }: ProjectWorkspaceErrorProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Workspace Error</p>
        <h1 className={styles.title}>真实工作区加载失败</h1>
        <p className={styles.description}>
          当前页面没有再回退到 mock 数据，请先修复真实 API 或工作区数据，再继续排查后续 AI 链路。
        </p>
        <pre className={styles.message}>{error.message}</pre>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => reset()}>
            重试
          </button>
          <Link href="/projects" className={styles.secondary}>
            返回项目列表
          </Link>
        </div>
      </div>
    </div>
  );
}
