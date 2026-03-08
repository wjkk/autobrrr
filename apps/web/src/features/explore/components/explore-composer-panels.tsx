'use client';

import { cx } from '@aiv/ui';

import { CONTENT_TABS, PRESET_LIBRARY } from './explore-page.data';
import styles from './explore-page.module.css';
import type { ContentTab } from './explore-page.types';

interface ExploreComposerPanelsProps {
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  onPresetSelect: (seedPrompt: string) => void;
}

function TabIcon({ tab }: { tab: ContentTab }) {
  if (tab === '短剧漫剧') {
    return (
      <div className={cx(styles.tabIconWrapper, styles.bgPink)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
      </div>
    );
  }

  if (tab === '音乐MV') {
    return (
      <div className={cx(styles.tabIconWrapper, styles.bgPurple)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
      </div>
    );
  }

  return (
    <div className={cx(styles.tabIconWrapper, styles.bgBlue)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line><line x1="8" y1="8" x2="10" y2="8"></line></svg>
    </div>
  );
}

export function ExploreComposerPanels({ activeTab, onTabChange, onPresetSelect }: ExploreComposerPanelsProps) {
  return (
    <div className={styles.expandedPanels}>
      <div className={styles.modeTabs}>
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            className={cx(styles.tabChip, activeTab === tab.id && styles.tabChipActive)}
            onClick={(event) => {
              event.stopPropagation();
              onTabChange(tab.id);
            }}
          >
            <TabIcon tab={tab.id} />
            <span>{tab.id}</span>
            {tab.beta && <span className={styles.betaTag}>Beta</span>}
          </button>
        ))}
      </div>

      <div className={styles.presetGallery}>
        {PRESET_LIBRARY[activeTab].map((preset) => (
          <button key={`${activeTab}-${preset.title}`} className={styles.presetCard} onClick={() => onPresetSelect(preset.seedPrompt)}>
            <span className={styles.presetTitle}>{preset.title}</span>
            <div className={styles.presetImages}>
              <img src={preset.previewUrls[0]} alt="preset preview 1" className={styles.presetImg1} />
              <img src={preset.previewUrls[1]} alt="preset preview 2" className={styles.presetImg2} />
              <img src={preset.previewUrls[2]} alt="preset preview 3" className={styles.presetImg3} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
