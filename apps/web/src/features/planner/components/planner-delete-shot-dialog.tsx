'use client';

import { Dialog } from '@/features/shared/components/dialog';

import styles from './planner-page.module.css';

interface PlannerDeleteShotDialogProps {
  open: boolean;
  shotTitle: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function PlannerDeleteShotDialog(props: PlannerDeleteShotDialogProps) {
  return (
    <Dialog
      open={props.open}
      title="确认删除分镜"
      description="删除此分镜后将无法恢复，确认要删除吗？"
      onClose={props.onClose}
      footer={(
        <>
          <button type="button" className={styles.dialogGhostButton} onClick={props.onClose}>
            取消
          </button>
          <button type="button" className={styles.dialogPrimaryButton} onClick={props.onConfirm}>
            确定
          </button>
        </>
      )}
    >
      <p className={styles.deleteShotHint}>分镜：{props.shotTitle ?? '未命名分镜'}</p>
    </Dialog>
  );
}
