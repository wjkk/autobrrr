'use client';

import { cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import styles from './creation-page.module.css';

export function CreationLipsyncSidebar({ controller }: { controller: CreationWorkspaceController }) {
  const { creation } = controller;

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
