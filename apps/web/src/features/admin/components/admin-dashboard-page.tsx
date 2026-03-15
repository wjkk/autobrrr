import Link from 'next/link';

import styles from './admin-dashboard-page.module.css';
import { AdminShell } from './admin-shell';

export function AdminDashboardPage() {
  return (
    <AdminShell pageTitle="系统后台" active="dashboard">
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <div className={styles.eyebrow}>System Console</div>
            <h1 className={styles.title}>系统治理入口</h1>
            <p className={styles.subtitle}>把会影响全局运行时行为的功能统一收敛到系统后台：Agent 治理、公共目录治理、模型目录治理和运行审计。用户自己的 API Key 与个人资产不进入这里。</p>
          </div>
          <aside className={styles.summaryPanel}>
            <div className={styles.metricCard}><span>系统级</span><strong>Agent / 公共目录 / 模型目录</strong></div>
            <div className={styles.metricCard}><span>用户级</span><strong>API Key / 我的空间 / 项目工作区</strong></div>
            <div className={styles.metricCard}><span>迁移原则</span><strong>全局真相源进后台，个人偏好留用户侧</strong></div>
          </aside>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardTitle}>Agent 管理</div>
            <div className={styles.cardDesc}>迁入当前 planner agent 管理、调试、回放与 A/B 能力。</div>
            <ul className={styles.cardList}>
              <li>编辑 / 发布 AgentProfile 与 SubAgentProfile</li>
              <li>回放 / replay / compare</li>
              <li>查看运行历史和 prompt 治理能力</li>
            </ul>
            <div className={styles.cardActions}>
              <Link href="/admin/planner-agents" className={styles.action}>进入 Agent 管理</Link>
              <Link href="/admin/planner-debug" className={styles.actionSecondary}>打开调试台</Link>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitle}>公共目录</div>
            <div className={styles.cardDesc}>只管理公共主体与公共画风，个人添加目录项留在用户侧后续拆分。</div>
            <ul className={styles.cardList}>
              <li>公共主体库</li>
              <li>公共画风库</li>
              <li>启用/停用、排序与基础治理</li>
            </ul>
            <div className={styles.cardActions}>
              <Link href="/admin/catalogs" className={styles.action}>进入公共目录</Link>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitle}>模型目录</div>
            <div className={styles.cardDesc}>查看系统 family / provider / endpoint，不混入用户 API Key 配置。</div>
            <ul className={styles.cardList}>
              <li>Endpoint 启用状态与默认关系</li>
              <li>按模型种类查看目录</li>
              <li>为后续系统治理预留入口</li>
            </ul>
            <div className={styles.cardActions}>
              <Link href="/admin/models" className={styles.action}>进入模型目录</Link>
              <Link href="/settings/providers" className={styles.actionSecondary}>用户 API Key 设置</Link>
            </div>
          </article>
        </section>
      </div>
    </AdminShell>
  );
}
