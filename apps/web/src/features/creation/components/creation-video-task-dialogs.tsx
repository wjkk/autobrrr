'use client';

import { Button, cx } from '@aiv/ui';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationModalShell } from './creation-modal-shell';
import dialogStyles from './creation-dialogs.module.css';
import styles from './creation-page.module.css';

function getVideoTaskShotCount(controller: CreationWorkspaceController, target: 'single' | 'all' | 'missing') {
  if (target === 'single') {
    return 1;
  }

  const missing = controller.creation.shots.filter((shot) => shot.status === 'failed' || !shot.versions.some((version) => version.mediaKind === 'video')).length;
  return target === 'missing' ? Math.max(1, missing) : controller.creation.shots.length;
}

export function CreationVideoTaskDialogs(props: {
  controller: CreationWorkspaceController;
}) {
  const { controller } = props;
  const { dialog, generateDraft } = controller;

  if (dialog.type !== 'generate' && dialog.type !== 'batch') {
    return null;
  }

  const batchShotCount = getVideoTaskShotCount(controller, dialog.type === 'batch' ? dialog.target : 'all');
  const generateShotCount = getVideoTaskShotCount(controller, 'single');
  const taskShotCount = dialog.type === 'batch' ? batchShotCount : generateShotCount;
  const taskCost = taskShotCount * 10;

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'generate'}
        title="转视频任务明细"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={controller.submitGeneration}>
              确认
            </button>
          </>
        }
      >
        <div className={dialogStyles.videoTaskPanel}>
          <div className={dialogStyles.videoTaskBadge}>
            <span className={dialogStyles.videoTaskStack} />
            <strong>{`x ${generateShotCount}`}</strong>
          </div>
          <div className={dialogStyles.videoTaskCard}>
            <div className={dialogStyles.videoTaskHeader}>转视频任务明细</div>
            <div className={dialogStyles.videoTaskRow}>
              <span>分辨率</span>
              <div className={dialogStyles.videoTaskSeg}>
                {(['720P', '1080P'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(dialogStyles.videoTaskSegButton, generateDraft.resolution === item && dialogStyles.videoTaskSegButtonActive)}
                    onClick={() => controller.setGenerateDraft({ ...generateDraft, resolution: item })}
                  >
                    {item}
                    {item === '1080P' ? <span className={dialogStyles.videoTaskCrown}>♛</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.videoTaskRow}>
              <div>
                <span>普通画面模型</span>
                <small>{`${generateShotCount}个分镜`}</small>
              </div>
              <div className={dialogStyles.videoTaskValue}>
                <strong>{controller.resolveModelDisplayName(generateDraft.model)}</strong>
                <small>当前选中模型</small>
              </div>
            </div>
            <div className={dialogStyles.videoTaskCostRow}>
              <span>积分消耗</span>
              <strong>{taskCost}</strong>
            </div>
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={dialog.type === 'batch'}
        title="转视频任务明细"
        size="compact"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerActions={
          <>
            <button type="button" className={styles.darkGhostButton} onClick={() => controller.setDialog({ type: 'none' })}>
              取消
            </button>
            <button type="button" className={styles.darkPrimaryButton} onClick={() => controller.submitBatch(dialog.type === 'batch' ? dialog.target : 'all')}>
              确认
            </button>
          </>
        }
      >
        <div className={dialogStyles.videoTaskPanel}>
          <div className={dialogStyles.videoTaskBadge}>
            <span className={dialogStyles.videoTaskStack} />
            <strong>{`x ${batchShotCount}`}</strong>
          </div>
          <div className={dialogStyles.videoTaskCard}>
            <div className={dialogStyles.videoTaskHeader}>转视频任务明细</div>
            <div className={dialogStyles.videoTaskRow}>
              <span>分辨率</span>
              <div className={dialogStyles.videoTaskSeg}>
                {(['720P', '1080P'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(dialogStyles.videoTaskSegButton, generateDraft.resolution === item && dialogStyles.videoTaskSegButtonActive)}
                    onClick={() => controller.setGenerateDraft({ ...generateDraft, resolution: item })}
                  >
                    {item}
                    {item === '1080P' ? <span className={dialogStyles.videoTaskCrown}>♛</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={dialogStyles.videoTaskRow}>
              <div>
                <span>普通画面模型</span>
                <small>{`${batchShotCount}个分镜`}</small>
              </div>
              <div className={dialogStyles.videoTaskValue}>
                <strong>{controller.resolveModelDisplayName(generateDraft.model)}</strong>
                <small>{dialog.type === 'batch' && dialog.target === 'missing' ? '补齐缺失分镜沿用此模型' : '全部分镜沿用此模型'}</small>
              </div>
            </div>
            <div className={dialogStyles.videoTaskModeRow}>
              {(['all', 'missing'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cx(dialogStyles.videoTaskModeButton, dialog.type === 'batch' && dialog.target === item && dialogStyles.videoTaskModeButtonActive)}
                  onClick={() => controller.setDialog({ type: 'batch', target: item })}
                >
                  {item === 'all' ? '全部分镜' : '仅缺失分镜'}
                </button>
              ))}
            </div>
            <div className={dialogStyles.videoTaskCostRow}>
              <span>积分消耗</span>
              <strong>{taskCost}</strong>
            </div>
          </div>
        </div>
      </CreationModalShell>
    </>
  );
}
