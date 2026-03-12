'use client';

import { Button, cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { CreationVisualSidebar } from './creation-visual-sidebar';
import { ShotPoster } from './shot-poster';
import styles from './creation-page.module.css';

interface CreationSidebarProps {
  controller: CreationWorkspaceController;
}

export function CreationSidebar({ controller }: CreationSidebarProps) {
  const { creation, activeShot, activeMaterial } = controller;

  if (!activeShot) {
    return null;
  }

  if (creation.activeTrack === 'visual') {
    return <CreationVisualSidebar controller={controller} />;
  }

  const accent = controller.shotAccent(activeShot.id);

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
                <Button variant="secondary" onClick={controller.addLipsyncDialogue}>
                  新增对白
                </Button>
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
          <Button onClick={controller.submitLipsync}>生成对口型</Button>
        </div>
      </aside>
    );
  }

  if (creation.activeTrack === 'voice') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarCard}>
          <div className={styles.sidebarTitleRow}>
            <span className={styles.sidebarDot} />
            <strong>{activeShot.title}</strong>
          </div>
          <div className={styles.scriptCard}>
            <small>旁白台词</small>
            <p>{activeShot.narrationText}</p>
            <em>{`时长 ${controller.formatShotDuration(activeShot.durationSeconds)}`}</em>
          </div>
          <label className={styles.fieldBlock}>
            <span>声音音色</span>
            <input className={styles.fieldInput} value={creation.voice.voiceName} onChange={(event) => controller.setVoiceField('voiceName', event.target.value)} />
          </label>
          <label className={styles.fieldBlock}>
            <span>情绪</span>
            <select className={styles.fieldSelect} value={creation.voice.emotion} onChange={(event) => controller.setVoiceField('emotion', event.target.value as typeof creation.voice.emotion)}>
              {['默认', '沉稳', '开心', '悲伤'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.sliderBlock}>
            <span>音量 {creation.voice.volume}</span>
            <input type="range" min="0" max="100" value={creation.voice.volume} onChange={(event) => controller.setVoiceField('volume', Number(event.target.value))} />
          </div>
          <div className={styles.sliderBlock}>
            <span>语速 {Number(creation.voice.speed).toFixed(1)}x</span>
            <input type="range" min="50" max="150" value={creation.voice.speed * 100} onChange={(event) => controller.setVoiceField('speed', Number(event.target.value) / 100)} />
          </div>
        </div>
      </aside>
    );
  }

  if (creation.activeTrack === 'music') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarCard}>
          <div className={styles.sidebarTitleRow}>
            <span className={styles.sidebarDot} />
            <strong>{activeShot.title}</strong>
          </div>
          <div className={styles.segmentedGroup}>
            {(['ai', 'library'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.segmentedButton, creation.music.mode === item && styles.segmentedButtonActive)}
                onClick={() => controller.setMusicField('mode', item)}
              >
                {item === 'ai' ? 'AI 生成' : '音乐库'}
              </button>
            ))}
          </div>
          <label className={styles.fieldBlock}>
            <span>音乐提示词</span>
            <textarea className={styles.fieldTextarea} value={creation.music.prompt} onChange={(event) => controller.setMusicField('prompt', event.target.value)} />
          </label>
          <div className={styles.musicCard}>
            <strong>{creation.music.trackName}</strong>
            <small>{creation.music.progress}</small>
          </div>
          <div className={styles.sliderBlock}>
            <span>音量 {creation.music.volume}</span>
            <input type="range" min="0" max="100" value={creation.music.volume} onChange={(event) => controller.setMusicField('volume', Number(event.target.value))} />
          </div>
          <Button variant={creation.music.applied ? 'secondary' : 'primary'} onClick={() => controller.setMusicField('applied', !creation.music.applied)}>
            {creation.music.applied ? '已应用' : '应用音乐'}
          </Button>
        </div>
      </aside>
    );
  }

  return null;
}
