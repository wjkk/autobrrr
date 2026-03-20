'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import styles from './creation-page.module.css';

const musicLibraryItems = [
  { id: 'rain', title: 'Rain Street Theme', meta: '钢琴 / 治愈 / 00:12' },
  { id: 'ambient', title: 'Quiet Neon Pads', meta: '氛围 / 冷静 / 00:18' },
  { id: 'warm', title: 'Warm Interior Loop', meta: '轻电子 / 室内 / 00:16' },
] as const;

function CreationVoiceSidebar({ controller }: { controller: CreationWorkspaceController }) {
  const { creation, activeShot } = controller;

  if (!activeShot) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.trackPanel}>
        <div className={styles.trackPanelTopline}>
          <span className={styles.sidebarDot} />
        </div>
        <div className={styles.trackPanelDivider} />
        <div className={styles.trackModeRow}>
          <button
            type="button"
            className={cx(styles.trackModeTab, creation.voice.mode === 'text' && styles.trackModeTabActive)}
            onClick={() => controller.setVoiceField('mode', 'text')}
          >
            文本朗读
          </button>
          <button
            type="button"
            className={cx(styles.trackModeTab, creation.voice.mode === 'upload' && styles.trackModeTabActive)}
            onClick={() => controller.setVoiceField('mode', 'upload')}
          >
            上传配音
          </button>
        </div>
        {creation.voice.mode === 'text' ? (
          <div className={styles.trackSection}>
            <span className={styles.trackSectionLabel}>配音文案</span>
            <div className={styles.trackPromptCard}>
              <textarea className={styles.trackPromptTextarea} value={activeShot.narrationText} readOnly />
            </div>
          </div>
        ) : (
          <div className={styles.trackSection}>
            <span className={styles.trackSectionLabel}>上传配音</span>
            <label className={styles.trackUploadCard}>
              <input
                className={styles.trackUploadInput}
                type="file"
                accept="audio/*"
                onChange={(event) => controller.setVoiceField('audioName', event.target.files?.[0]?.name ?? '')}
              />
              <div className={styles.trackUploadMeta}>
                <strong>{creation.voice.audioName || '选择音频文件'}</strong>
                <small>{creation.voice.audioName ? '已选择，可直接应用到当前分镜' : '支持 mp3、wav、m4a'}</small>
              </div>
              <span className={styles.secondaryTrackButton}>上传文件</span>
            </label>
          </div>
        )}
        <div className={styles.trackPreviewCard}>
          <div className={styles.voicePresetCard}>
            <div className={styles.voicePresetMeta}>
              <strong>{creation.voice.voiceName}</strong>
              <small>{creation.voice.emotion}</small>
            </div>
            <button type="button" className={styles.voicePresetSwap} onClick={() => controller.setVoiceField('emotion', creation.voice.emotion === '沉稳' ? '开心' : creation.voice.emotion === '开心' ? '悲伤' : '沉稳')}>
              <CreationIcon name="replace" className={styles.buttonGlyph} />
            </button>
          </div>
          <div className={styles.trackSettingGrid}>
            <button type="button" className={styles.trackSelectRow} onClick={() => controller.setVoiceField('voiceName', creation.voice.voiceName === '旁白女声 A' ? '旁白男声 B' : '旁白女声 A')}>
              <span>声音音色</span>
              <strong>{creation.voice.voiceName}</strong>
            </button>
            <button type="button" className={styles.trackSelectRow} onClick={() => controller.setVoiceField('emotion', creation.voice.emotion === '沉稳' ? '开心' : creation.voice.emotion === '开心' ? '悲伤' : '沉稳')}>
              <span>情绪</span>
              <strong>{creation.voice.emotion}</strong>
            </button>
          </div>
        </div>
        <div className={styles.trackSliderBlock}>
          <span>{`音量 ${creation.voice.volume}`}</span>
          <input className={styles.trackSlider} type="range" min="0" max="100" value={creation.voice.volume} onChange={(event) => controller.setVoiceField('volume', Number(event.target.value))} />
        </div>
        <div className={styles.trackSliderBlock}>
          <span>{`语速 ${Number(creation.voice.speed).toFixed(1)}x`}</span>
          <input className={styles.trackSlider} type="range" min="50" max="150" value={creation.voice.speed * 100} onChange={(event) => controller.setVoiceField('speed', Number(event.target.value) / 100)} />
        </div>
      </div>
    </aside>
  );
}

function CreationMusicSidebar({ controller }: { controller: CreationWorkspaceController }) {
  const { creation } = controller;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.trackPanel}>
        <div className={styles.trackPanelTopline}>
          <span className={styles.sidebarDot} />
        </div>
        <div className={styles.trackPanelDivider} />
        <div className={styles.trackModeRow}>
          {(['ai', 'library'] as const).map((item) => (
            <button key={item} type="button" className={cx(styles.trackModeTab, creation.music.mode === item && styles.trackModeTabActive)} onClick={() => controller.setMusicField('mode', item)}>
              {item === 'ai' ? 'AI 生成' : '音乐库'}
            </button>
          ))}
        </div>
        {creation.music.mode === 'ai' ? (
          <>
            <div className={styles.trackSection}>
              <span className={styles.trackSectionLabel}>音乐提示词</span>
              <div className={styles.trackPromptCard}>
                <textarea className={styles.trackPromptTextarea} value={creation.music.prompt} onChange={(event) => controller.setMusicField('prompt', event.target.value)} />
              </div>
            </div>
            <div className={styles.musicPreviewSurface}>
              <div className={styles.musicPreviewWave} />
            </div>
          </>
        ) : (
          <div className={styles.musicLibraryList}>
            {musicLibraryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(styles.musicLibraryCard, creation.music.trackName === item.title && styles.musicLibraryCardActive)}
                onClick={() => controller.setMusicField('trackName', item.title)}
              >
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </button>
            ))}
          </div>
        )}
        <div className={styles.musicTrackMetaCard}>
          <strong>{creation.music.trackName}</strong>
          <small>{creation.music.progress}</small>
        </div>
        <div className={styles.trackSliderBlock}>
          <span>{`音量 ${creation.music.volume}`}</span>
          <input className={styles.trackSlider} type="range" min="0" max="100" value={creation.music.volume} onChange={(event) => controller.setMusicField('volume', Number(event.target.value))} />
        </div>
        <button type="button" className={cx(styles.primaryTrackButton, creation.music.applied && styles.secondaryTrackButton)} onClick={() => controller.setMusicField('applied', !creation.music.applied)}>
          {creation.music.applied ? '已应用' : '应用音乐'}
        </button>
      </div>
    </aside>
  );
}

export function CreationAudioSidebar({ controller }: { controller: CreationWorkspaceController }) {
  if (controller.creation.activeTrack === 'voice') {
    return <CreationVoiceSidebar controller={controller} />;
  }

  if (controller.creation.activeTrack === 'music') {
    return <CreationMusicSidebar controller={controller} />;
  }

  return null;
}
