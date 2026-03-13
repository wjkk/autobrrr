'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationVisualSidebar } from './creation-visual-sidebar';
import { ShotPoster } from './shot-poster';
import styles from './creation-page.module.css';

interface CreationSidebarProps {
  controller: CreationWorkspaceController;
}

export function CreationSidebar({ controller }: CreationSidebarProps) {
  const { creation, activeShot } = controller;

  if (!activeShot) {
    return null;
  }

  if (creation.activeTrack === 'visual') {
    return <CreationVisualSidebar controller={controller} />;
  }

  const musicLibraryItems = [
    { id: 'rain', title: 'Rain Street Theme', meta: '钢琴 / 治愈 / 00:12' },
    { id: 'ambient', title: 'Quiet Neon Pads', meta: '氛围 / 冷静 / 00:18' },
    { id: 'warm', title: 'Warm Interior Loop', meta: '轻电子 / 室内 / 00:16' },
  ] as const;

  if (creation.viewMode === 'lipsync') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarCard}>
          <div className={styles.sidebarTitleRow}>
            <span className={styles.sidebarDot} />
            <strong>对口型</strong>
          </div>
          <div className={styles.segmentedGroup}>
            {(['single', 'multi'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.segmentedButton, creation.lipSync.mode === item && styles.segmentedButtonActive)}
                onClick={() => controller.setLipsyncField('mode', item)}
              >
                {item === 'single' ? '单人模式' : '多人模式'}
              </button>
            ))}
          </div>
          <div className={styles.segmentedGroup}>
            {(['text', 'audio'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.segmentedButton, creation.lipSync.inputMode === item && styles.segmentedButtonActive)}
                onClick={() => controller.setLipsyncField('inputMode', item)}
              >
                {item === 'text' ? '文本朗读' : '上传配音'}
              </button>
            ))}
          </div>
          <label className={styles.fieldBlock}>
            <span>底图</span>
            <select
              className={styles.fieldSelect}
              value={creation.lipSync.baseShotId}
              onChange={(event) => controller.setLipsyncField('baseShotId', event.target.value)}
            >
              {creation.shots.map((shot) => (
                <option key={shot.id} value={shot.id}>
                  {shot.title}
                </option>
              ))}
            </select>
          </label>
          {creation.lipSync.inputMode === 'text' ? (
            <div className={styles.dialogueList}>
              {creation.lipSync.dialogues.map((item, index) => (
                <div key={item.id} className={styles.dialogueCard}>
                  <div className={styles.dialogueHead}>
                    <strong>{`对白 ${index + 1}`}</strong>
                    <button type="button" className={styles.darkGhostButton} onClick={() => controller.removeLipsyncDialogue(item.id)}>
                      删除
                    </button>
                  </div>
                  <input
                    className={styles.fieldInput}
                    value={item.speaker}
                    onChange={(event) => controller.updateLipsyncDialogue(item.id, 'speaker', event.target.value)}
                  />
                  <textarea
                    className={styles.fieldTextarea}
                    value={item.text}
                    onChange={(event) => controller.updateLipsyncDialogue(item.id, 'text', event.target.value)}
                  />
                </div>
              ))}
              {creation.lipSync.mode === 'multi' ? (
                <button type="button" className={styles.secondaryTrackButton} onClick={controller.addLipsyncDialogue}>
                  新增对白
                </button>
              ) : null}
            </div>
          ) : (
            <label className={styles.fieldBlock}>
              <span>上传音频</span>
              <input
                className={styles.fieldInput}
                type="file"
                accept="audio/*"
                onChange={(event) => controller.setLipsyncField('audioName', event.target.files?.[0]?.name ?? '')}
              />
            </label>
          )}
          <div className={styles.fieldRow}>
            <label className={styles.fieldBlock}>
              <span>音色模型</span>
              <select
                className={styles.fieldSelect}
                value={creation.lipSync.voiceModel}
                onChange={(event) => controller.setLipsyncField('voiceModel', event.target.value)}
              >
                {['Sync Voice', 'Sync Voice Pro', 'Sync Voice Max'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fieldBlock}>
              <span>情绪</span>
              <select className={styles.fieldSelect} value={creation.lipSync.emotion} onChange={(event) => controller.setLipsyncField('emotion', event.target.value as typeof creation.lipSync.emotion)}>
                {['默认', '温暖', '急促'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.sliderBlock}>
            <span>音量 {creation.lipSync.volume}</span>
            <input type="range" min="0" max="100" value={creation.lipSync.volume} onChange={(event) => controller.setLipsyncField('volume', Number(event.target.value))} />
          </div>
          <div className={styles.sliderBlock}>
            <span>语速 {Number(creation.lipSync.speed).toFixed(1)}x</span>
            <input type="range" min="50" max="150" value={creation.lipSync.speed * 100} onChange={(event) => controller.setLipsyncField('speed', Number(event.target.value) / 100)} />
          </div>
          {controller.lipsyncNotice ? <div className={styles.noticeInline}>{controller.lipsyncNotice}</div> : null}
          <button type="button" className={styles.primaryTrackButton} onClick={controller.submitLipsync}>
            生成对口型
          </button>
        </div>
      </aside>
    );
  }

  if (creation.activeTrack === 'voice') {
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

  if (creation.activeTrack === 'music') {
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

  return null;
}
