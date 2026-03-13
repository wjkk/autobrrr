'use client';

import { cx } from '@aiv/ui';
import { useState } from 'react';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationIcon } from './creation-icons';
import { ShotPoster } from './shot-poster';
import styles from './creation-lipsync-editor.module.css';

const VOICE_OPTIONS = [
  { id: '阳光云希', meta: '男性/青年/普通话' },
  { id: '晨星小羽', meta: '女性/青年/普通话' },
  { id: '沉稳旁白', meta: '中性/成熟/普通话' },
] as const;
const EMOTION_OPTIONS = ['默认', '温暖', '急促'] as const;

export function CreationLipsyncEditor({ controller }: { controller: CreationWorkspaceController }) {
  const { dialog, creation, activeShot, lipsyncNotice } = controller;
  const [shotPickerOpen, setShotPickerOpen] = useState(false);

  if (dialog.type !== 'lipsync' || !activeShot) {
    return null;
  }

  const baseShot = creation.shots.find((shot) => shot.id === creation.lipSync.baseShotId) ?? activeShot;
  const previewShot = {
    ...baseShot,
    canvasTransform: {
      ...baseShot.canvasTransform,
      ratio: '9:16' as const,
    },
  };
  const accent = controller.shotAccent(baseShot.id);
  const selectedVoice = VOICE_OPTIONS.find((item) => item.id === creation.lipSync.voiceModel) ?? VOICE_OPTIONS[0];
  const primaryDialogue = creation.lipSync.dialogues[0];
  const draftLength = primaryDialogue?.text.length ?? 0;

  const closeEditor = () => {
    controller.setLipsyncNotice(null);
    controller.setDialog({ type: 'none' });
  };

  const handleSubmit = () => {
    controller.submitLipsync();
  };

  const cycleVoiceModel = () => {
    const currentIndex = VOICE_OPTIONS.findIndex((item) => item.id === creation.lipSync.voiceModel);
    const next = VOICE_OPTIONS[(currentIndex + 1 + VOICE_OPTIONS.length) % VOICE_OPTIONS.length];
    controller.setLipsyncField('voiceModel', next.id);
  };

  const cycleEmotion = () => {
    const currentIndex = EMOTION_OPTIONS.findIndex((item) => item === creation.lipSync.emotion);
    const next = EMOTION_OPTIONS[(currentIndex + 1 + EMOTION_OPTIONS.length) % EMOTION_OPTIONS.length];
    controller.setLipsyncField('emotion', next);
  };

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorHeader}>
        <div className={styles.headerEdge}>
          <button type="button" className={styles.backButton} onClick={closeEditor}>
            <CreationIcon name="back" className={styles.backButtonIcon} />
            <span>返回</span>
          </button>
        </div>

        <div className={styles.modeToggle}>
          {(['single', 'multi'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={cx(styles.modeButton, creation.lipSync.mode === item && styles.modeButtonActive)}
              onClick={() => controller.setLipsyncField('mode', item)}
            >
              <span>{item === 'single' ? '单人模式' : '多人模式'}</span>
            </button>
          ))}
        </div>

        <div className={styles.headerEdgeRight}>
          <div className={styles.pointBadge}>
            <span>108</span>
          </div>
          <button type="button" className={styles.memberButton}>
            开通会员
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <div className={styles.previewStage}>
          <div className={styles.previewCard}>
            <button type="button" className={styles.replaceButton} onClick={() => setShotPickerOpen((current) => !current)}>
              <CreationIcon name="replace" className={styles.replaceButtonIcon} />
              <span>替换</span>
            </button>

            {shotPickerOpen ? (
              <div className={styles.shotPicker}>
                {creation.shots.map((shot) => (
                  <button
                    key={shot.id}
                    type="button"
                    className={cx(styles.shotPickerItem, shot.id === creation.lipSync.baseShotId && styles.shotPickerItemActive)}
                    onClick={() => {
                      controller.setLipsyncField('baseShotId', shot.id);
                      setShotPickerOpen(false);
                    }}
                  >
                    <span>{shot.title}</span>
                    <small>{controller.formatShotDuration(shot.durationSeconds)}</small>
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.previewPosterWrap}>
              <ShotPoster
                shot={previewShot}
                size="stage"
                accent={accent}
                showCaption={false}
                showTag={false}
                className={styles.previewPoster}
              />
            </div>
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.sideInner}>
            <div className={styles.segmentedRow}>
              {(['text', 'audio'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(styles.segmentButton, creation.lipSync.inputMode === item && styles.segmentButtonActive)}
                  onClick={() => controller.setLipsyncField('inputMode', item)}
                >
                  {item === 'text' ? '文本朗读' : '上传配音'}
                </button>
              ))}
            </div>

            {creation.lipSync.inputMode === 'text' ? (
              <div className={styles.textCard}>
                <textarea
                  className={styles.dialogueTextarea}
                  value={primaryDialogue?.text ?? ''}
                  onChange={(event) => primaryDialogue && controller.updateLipsyncDialogue(primaryDialogue.id, 'text', event.target.value)}
                />
                <div className={styles.textMeta}>
                  <button type="button" className={styles.metaButton}>
                    试听
                  </button>
                  <button type="button" className={styles.metaButton}>
                    停顿
                  </button>
                  <span>{`约 ${Math.max(1, Math.round(draftLength / 14))}s 音频 ${draftLength}/240`}</span>
                </div>
              </div>
            ) : (
              <label className={styles.audioUploadCard}>
                <span className={styles.audioUploadTitle}>上传配音</span>
                <small className={styles.audioUploadMeta}>{creation.lipSync.audioName || '选择一段音频作为口型驱动源'}</small>
                <input
                  className={styles.audioUploadInput}
                  type="file"
                  accept="audio/*"
                  onChange={(event) => controller.setLipsyncField('audioName', event.target.files?.[0]?.name ?? '')}
                />
              </label>
            )}

            <section className={styles.sectionBlock}>
              <div className={styles.sectionTitle}>声音音色</div>
              <div className={styles.voiceCard}>
                <button type="button" className={styles.voiceMainRow} onClick={cycleVoiceModel}>
                  <div className={styles.voiceMainMeta}>
                    <strong>{selectedVoice.id}</strong>
                    <small>{selectedVoice.meta}</small>
                  </div>
                  <CreationIcon name="replace" className={styles.voiceSwapIcon} />
                </button>
                <button type="button" className={styles.voiceSubRow} onClick={cycleEmotion}>
                  <span>情绪: {creation.lipSync.emotion}</span>
                  <CreationIcon name="chevron" className={styles.voiceChevron} />
                </button>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionTitle}>声音音量</div>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={creation.lipSync.volume}
                  onChange={(event) => controller.setLipsyncField('volume', Number(event.target.value))}
                />
                <strong>{creation.lipSync.volume}</strong>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionTitle}>声音语速</div>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={creation.lipSync.speed * 100}
                  onChange={(event) => controller.setLipsyncField('speed', Number(event.target.value) / 100)}
                />
                <strong>{`${creation.lipSync.speed.toFixed(1)}x`}</strong>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionTitle}>画面描述（选填）</div>
              <textarea className={styles.promptTextarea} placeholder="输入对画面内容的描述" value={activeShot.motionPrompt} readOnly />
            </section>

            {creation.lipSync.mode === 'multi' ? (
              <section className={styles.sectionBlock}>
                <div className={styles.multiHeader}>
                  <div className={styles.sectionTitle}>多人对白</div>
                  <button type="button" className={styles.addDialogueButton} onClick={controller.addLipsyncDialogue}>
                    新增对白
                  </button>
                </div>
                <div className={styles.multiDialogueList}>
                  {creation.lipSync.dialogues.map((item, index) => (
                    <div key={item.id} className={styles.multiDialogueCard}>
                      <input value={item.speaker} onChange={(event) => controller.updateLipsyncDialogue(item.id, 'speaker', event.target.value)} />
                      <textarea value={item.text} onChange={(event) => controller.updateLipsyncDialogue(item.id, 'text', event.target.value)} placeholder={`对白 ${index + 1}`} />
                      {creation.lipSync.dialogues.length > 1 ? (
                        <button type="button" className={styles.removeDialogueButton} onClick={() => controller.removeLipsyncDialogue(item.id)}>
                          删除
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {lipsyncNotice ? <div className={styles.notice}>{lipsyncNotice}</div> : null}

            <div className={styles.bottomBar}>
              <button type="button" className={styles.modelButton}>
                <span>SekoTalk</span>
                <CreationIcon name="chevron" className={styles.bottomChevron} />
              </button>
              <button type="button" className={styles.resolutionButton}>
                <span>720P</span>
                <CreationIcon name="chevron" className={styles.bottomChevron} />
              </button>
              <button type="button" className={styles.submitButton} onClick={handleSubmit}>
                生成视频
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
