import Link from 'next/link';

import { cx } from '@aiv/ui';

import type { ProjectStage } from '../lib/project-stage';

interface StageLinksProps {
  projectId: string;
  activeStage: ProjectStage;
}

const stageConfig: Array<{ id: ProjectStage; label: string; href: (projectId: string) => string }> = [
  {
    id: 'planner',
    label: '策划',
    href: (projectId) => `/projects/${projectId}/planner`,
  },
  {
    id: 'creation',
    label: '分片生成',
    href: (projectId) => `/projects/${projectId}/creation`,
  },
  {
    id: 'publish',
    label: '发布',
    href: (projectId) => `/projects/${projectId}/publish`,
  },
];

export function StageLinks({ projectId, activeStage }: StageLinksProps) {
  return (
    <div className="stage-links-wrap">
      <nav className="stage-links" aria-label="项目阶段">
        {stageConfig.map((stage) => {
          const active = stage.id === activeStage;

          return (
            <Link
              key={stage.id}
              href={stage.href(projectId)}
              className={cx('stage-links__item', active && 'stage-links__item--active')}
              aria-current={active ? 'page' : undefined}
            >
              {stage.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/settings/providers" className="stage-links__settings">
        接口配置
      </Link>
    </div>
  );
}
