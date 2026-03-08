'use client';

import type { CreationViewMode, StudioFixture } from '@aiv/domain';
import Link from 'next/link';
import { Badge, Button, cx } from '@aiv/ui';

import { useCreationWorkspace } from '../lib/use-creation-workspace';
import { CreationDialogs } from './creation-dialogs';
import { CreationSidebar } from './creation-sidebar';
import { CreationStage } from './creation-stage';
import { CreationTimeline } from './creation-timeline';
import { CreationVersionRail } from './creation-version-rail';
import styles from './creation-page.module.css';

interface CreationPageProps {
  studio: StudioFixture;
  initialShotId?: string;
  initialView?: CreationViewMode;
}

export function CreationPage({ studio, initialShotId, initialView }: CreationPageProps) {
  const controller = useCreationWorkspace({ studio, initialShotId, initialView });

  return (
    <>
      <div className={styles.creationShell}>
        <header className={styles.creationHeader}>
          <div className={styles.creationHeaderLeft}>
            <Link href={`/projects/${studio.project.id}/planner`} className={styles.backButton}>
              ← 返回策划
            </Link>
            <div className={styles.projectTitleGroup}>
              <small>{studio.brandName}</small>
              <h1>{studio.project.title}</h1>
            </div>
          </div>
          <div className={styles.creationHeaderActions}>
            <Badge>{studio.scenarioLabel}</Badge>
            <span className={styles.pointBadge}>{`✦ ${controller.creation.points}`}</span>
            <Button variant="secondary" onClick={() => controller.openBatchDialog('missing')}>
              批量补缺
            </Button>
            <Button onClick={() => controller.openBatchDialog('all')}>一键转视频</Button>
            <Button variant="secondary">导出</Button>
          </div>
        </header>

        <div className={styles.stageHeaderBar}>
          <div className={styles.stageHeaderMeta}>
            <Badge>{studio.episodes[0]?.title ?? '单集项目'}</Badge>
            <Badge>{`当前分镜 ${controller.activeShot?.title ?? '-'}`}</Badge>
            <Badge tone={controller.activeShot?.status === 'failed' ? 'danger' : controller.activeShot?.status === 'generating' ? 'warning' : 'success'}>
              {controller.activeShot ? controller.statusLabel(controller.activeShot.status) : '待选择'}
            </Badge>
          </div>
          <div className={styles.stageHeaderNav}>
            {[
              { id: 'planner', label: '策划', href: `/projects/${studio.project.id}/planner` },
              { id: 'creation', label: '分片生成', href: `/projects/${studio.project.id}/creation` },
              { id: 'publish', label: '发布', href: `/projects/${studio.project.id}/publish` },
            ].map((item) => (
              <Link key={item.id} href={item.href} className={cx(styles.headerNavChip, item.id === 'creation' && styles.headerNavChipActive)}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.workspaceFrame}>
          <nav className={styles.trackRail} aria-label="分轨工作区">
            {([
              { id: 'visual', label: '画面' },
              { id: 'voice', label: '配音' },
              { id: 'music', label: '音乐' },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(styles.trackButton, controller.creation.activeTrack === item.id && styles.trackButtonActive)}
                onClick={() => controller.setActiveTrack(item.id)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <CreationSidebar controller={controller} />

          <div className={styles.centerColumn}>
            <div className={styles.viewModeRow}>
              {(['storyboard', 'default', 'lipsync'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(styles.viewModeButton, controller.creation.viewMode === item && styles.viewModeButtonActive)}
                  onClick={() => controller.setViewMode(item)}
                >
                  {item === 'storyboard' ? '故事版' : item === 'default' ? '默认视图' : '对口型'}
                </button>
              ))}
            </div>
            <CreationStage controller={controller} />
            <CreationTimeline controller={controller} />
          </div>

          <CreationVersionRail controller={controller} />
        </div>
      </div>

      <CreationDialogs controller={controller} />
    </>
  );
}
