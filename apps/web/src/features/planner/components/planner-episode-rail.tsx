'use client';

import { cx } from '@aiv/ui';

import styles from './planner-page.module.css';

interface PlannerEpisodeRailItem {
  id: string;
  label: string;
  title: string;
  shotCount: number;
}

interface PlannerEpisodeRailProps {
  episodes: PlannerEpisodeRailItem[];
  activeEpisodeId: string;
  onSelectEpisode: (episodeId: string) => void;
}

export function PlannerEpisodeRail(props: PlannerEpisodeRailProps) {
  return (
    <aside className={styles.episodeRail}>
      <h2>剧集</h2>
      <div className={styles.episodeList}>
        {props.episodes.map((episode, index) => {
          const active = episode.id === props.activeEpisodeId;

          return (
            <button
              key={episode.id}
              type="button"
              className={cx(styles.episodeButton, active && styles.episodeButtonActive)}
              onClick={() => props.onSelectEpisode(episode.id)}
              aria-label={`切换到 ${episode.label}`}
              title={`${episode.title} · ${episode.shotCount} 镜头`}
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
