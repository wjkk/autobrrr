'use client';

import { Dialog } from '@/features/shared/components/dialog';

import styles from './planner-page.module.css';

interface PlannerCreationBootDialogProps {
  open: boolean;
  progress: number;
  remainingPoints: number;
}

export function PlannerCreationBootDialog(props: PlannerCreationBootDialogProps) {
  return (
    <Dialog
      open={props.open}
      title="正在进入分片生成"
      description="正在提交任务并切换到 Creation 工作区。"
      onClose={() => undefined}
    >
      <div className={styles.bootCard}>
        <div className={styles.bootValue}>{props.progress}%</div>
        <div className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${props.progress}%` }} />
        </div>
        <p>提交分镜任务中，请稍候...</p>
        <p>剩余积分：{props.remainingPoints}</p>
      </div>
    </Dialog>
  );
}
