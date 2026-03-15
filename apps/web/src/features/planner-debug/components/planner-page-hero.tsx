'use client';

import styles from './planner-agent-debug-page.module.css';

export function PlannerPageHero(props: { mode: 'manage' | 'debug' }) {
  return (
    <section className={styles.hero}>
      <div>
        <div className={styles.eyebrow}>{props.mode === 'manage' ? '策划 Agent 管理台' : '策划 Agent 调试台'}</div>
        <h1 className={styles.title}>{props.mode === 'manage' ? '策划 Agent 管理台' : '策划 Agent 调试台'}</h1>
        <p className={styles.subtitle}>
          {props.mode === 'manage'
            ? '集中维护策划 Agent 的草稿配置、发布版本和调试入口。左侧选对象，右侧完成编辑，发布前后都能快速核对差异。'
            : '围绕单个子 Agent 做独立试跑、回放与 A/B 对比。这里专注验证 prompt、输出结构和主图结果，不影响主流程页面。'}
        </p>
      </div>
      <div className={styles.heroMeta}>
        <div className={styles.metaPill}>{props.mode === 'manage' ? '编辑草稿、对照发布、再决定是否上线' : '先跑单次结果，再看并排 A/B 差异'}</div>
        <div className={styles.metaPill}>{props.mode === 'manage' ? '适合配置收口与版本回填' : '适合 prompt 与输出诊断'}</div>
      </div>
    </section>
  );
}
