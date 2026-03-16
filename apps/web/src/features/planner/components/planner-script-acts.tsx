'use client';

import { cx } from '@aiv/ui';

import type { PlannerShotDraftState, PlannerShotPointer } from '../lib/planner-shot-editor';
import type { SekoActDraft } from '../lib/seko-plan-data';
import styles from './planner-page.module.css';

interface PlannerScriptActsProps {
  acts: SekoActDraft[];
  sceneTitles: string[];
  plannerSubmitting: boolean;
  runtimeEnabled: boolean;
  editingShot: PlannerShotPointer | null;
  shotDraft: PlannerShotDraftState | null;
  onOpenShotEditor: (actId: string, shotId: string) => void;
  onOpenShotDeleteDialog: (actId: string, shotId: string) => void;
  onActRerun: (actId: string) => void;
  onShotDraftChange: (updater: (current: PlannerShotDraftState | null) => PlannerShotDraftState | null) => void;
  onRerunShot: () => void;
  onGenerateShotImage: () => void;
  onCancelShotEditor: () => void;
  onSaveShot: () => void;
}

export function PlannerScriptActs(props: PlannerScriptActsProps) {
  return (
    <div className={styles.actStack}>
      {props.acts.map((act, actIndex) => (
        <section key={act.id} className={styles.actSection}>
          <header className={styles.actHeader}>
            <div className={styles.actHeaderMain}>
              <strong>
                {act.title}：{props.sceneTitles[actIndex] ?? `场景 ${actIndex + 1}`}
              </strong>
              <span>
                {act.time || '夜晚'} · {act.location || '室外'}
              </span>
            </div>
            {props.runtimeEnabled ? (
              <button
                type="button"
                className={styles.actRerunButton}
                onClick={() => props.onActRerun(act.id)}
                disabled={props.plannerSubmitting}
              >
                重写本幕
              </button>
            ) : null}
          </header>

          <div className={styles.scriptList}>
            {act.shots.map((shot) => {
              const isEditingShot = props.editingShot?.actId === act.id && props.editingShot?.shotId === shot.id;

              return (
                <article key={shot.id} className={cx(styles.scriptCard, styles.scriptShotCard, isEditingShot && styles.scriptShotCardEditing)}>
                  {shot.image ? (
                    <div className={styles.shotPreviewImageWrap}>
                      <img src={shot.image} alt={`${shot.title} 草图`} className={styles.shotPreviewImage} />
                    </div>
                  ) : null}
                  <p className={styles.shotTitleLine}>
                    <span>{shot.title}</span>
                  </p>
                  <ul className={styles.shotPreviewList}>
                    <li>
                      <span>画面描述</span>
                      {isEditingShot && props.shotDraft ? (
                        <textarea
                          className={styles.shotInlineTextarea}
                          value={props.shotDraft.visual}
                          onChange={(event) =>
                            props.onShotDraftChange((current) => (current ? { ...current, visual: event.target.value } : current))
                          }
                        />
                      ) : (
                        <p className={styles.shotValueText}>{shot.visual}</p>
                      )}
                    </li>
                    <li>
                      <span>构图设计</span>
                      {isEditingShot && props.shotDraft ? (
                        <textarea
                          className={styles.shotInlineTextarea}
                          value={props.shotDraft.composition}
                          onChange={(event) =>
                            props.onShotDraftChange((current) => (current ? { ...current, composition: event.target.value } : current))
                          }
                        />
                      ) : (
                        <p className={styles.shotValueText}>{shot.composition}</p>
                      )}
                    </li>
                    <li>
                      <span>运镜调度</span>
                      {isEditingShot && props.shotDraft ? (
                        <textarea
                          className={styles.shotInlineTextarea}
                          value={props.shotDraft.motion}
                          onChange={(event) =>
                            props.onShotDraftChange((current) => (current ? { ...current, motion: event.target.value } : current))
                          }
                        />
                      ) : (
                        <p className={styles.shotValueText}>{shot.motion}</p>
                      )}
                    </li>
                    <li>
                      <span>配音角色</span>
                      <p className={styles.shotValueText}>{shot.voice}</p>
                    </li>
                    <li>
                      <span>台词内容</span>
                      {isEditingShot && props.shotDraft ? (
                        <textarea
                          className={styles.shotInlineTextarea}
                          value={props.shotDraft.line}
                          onChange={(event) =>
                            props.onShotDraftChange((current) => (current ? { ...current, line: event.target.value } : current))
                          }
                        />
                      ) : (
                        <p className={styles.shotValueText}>{shot.line}</p>
                      )}
                    </li>
                  </ul>

                  <div className={cx(styles.shotActionButtons, isEditingShot && styles.shotActionButtonsEditing)}>
                    {isEditingShot ? (
                      <>
                        {props.runtimeEnabled ? (
                          <button type="button" className={styles.shotRerunButton} onClick={props.onRerunShot}>
                            AI重写
                          </button>
                        ) : null}
                        {props.runtimeEnabled ? (
                          <button type="button" className={styles.shotSketchButton} onClick={props.onGenerateShotImage}>
                            生成草图
                          </button>
                        ) : null}
                        <button type="button" className={styles.shotCancelButton} onClick={props.onCancelShotEditor}>
                          取消
                        </button>
                        <button type="button" className={styles.shotSaveButton} onClick={props.onSaveShot}>
                          保存
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={styles.shotIconButton} onClick={() => props.onOpenShotDeleteDialog(act.id, shot.id)} aria-label={`删除 ${shot.title}`}>
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M3.196 3.73a.68.68 0 1 0 0 1.362V3.73M16.41 5.092a.68.68 0 1 0 0-1.362v1.362M9.216 6.667a.68.68 0 1 0-1.362 0h1.361M7.854 13.91a.68.68 0 1 0 1.362 0H7.855m4.473-7.244a.68.68 0 1 0-1.362 0h1.361m-1.362 7.244a.68.68 0 1 0 1.362 0h-1.361m-5.794-9.5h-.68l-.002 11.45h.68l.681.001.002-11.45zm.665 12.118v.68h8.319v-1.361H5.836zm8.985-.667h.68V4.412h-1.36v11.45zM7.294 3.195v.681h5.017V2.515H7.294zm1.241 3.472h-.68v7.244h1.36V6.667zm3.111 0h-.68v7.244h1.36V6.667zM3.196 4.41v.681H6.96V3.73H3.196zM6.96 3.53h-.68v.882H7.64V3.53zm0 .882v.681h5.685V3.73H6.96zm5.685 0v.681h3.764V3.73h-3.764zm0-.882h-.681v.882h1.361V3.53zm-.334-.334v.681a.347.347 0 0 1-.347-.347h1.361c0-.56-.454-1.014-1.014-1.014zm1.844 13.334v.68c.744 0 1.347-.603 1.347-1.347H14.14v-.002l.002-.004q0-.003.003-.004l.004-.003h.003l.002-.001zM7.294 3.195v-.68c-.56 0-1.015.454-1.015 1.014h1.362a.347.347 0 0 1-.347.347zM5.169 15.862h-.68c0 .744.603 1.347 1.347 1.347v-1.361h.002l.004.001.004.003.003.004.001.006z"
                            />
                          </svg>
                        </button>
                        <button type="button" className={styles.shotIconButton} onClick={() => props.onOpenShotEditor(act.id, shot.id)} aria-label={`编辑 ${shot.title}`}>
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path stroke="currentColor" strokeWidth="1.35" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622L6.075 17.192a.46.46 0 0 1-.325.135H3.967a.46.46 0 0 1-.459-.459v-1.784c0-.121.048-.238.134-.324z" />
                            <path fill="currentColor" d="M14.049 4.354a1.147 1.147 0 0 1 1.621 0l.811.81a1.147 1.147 0 0 1 0 1.622l-2.108 2.108c-.18.18-.47.18-.649 0l-1.783-1.783a.46.46 0 0 1 0-.65z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
