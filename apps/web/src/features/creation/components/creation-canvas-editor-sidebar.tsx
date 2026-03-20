'use client';

import { cx } from '@aiv/ui';

import type { Shot } from '@aiv/domain';

import type { CanvasDraft } from '../lib/ui-state';
import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import type { shotAccent } from '../lib/creation-utils';
import { RATIO_OPTIONS, TRANSFORM_ZOOM_MAX, TRANSFORM_ZOOM_MIN } from './creation-canvas-editor-helpers';
import { CreationIcon } from './creation-icons';
import { ShotPoster } from './shot-poster';
import styles from './creation-canvas-editor.module.css';

interface HistoryRecord {
  id: string;
  title: string;
  detail: string;
  shot: Shot;
}

interface CreationCanvasEditorSidebarProps {
  controller: CreationWorkspaceController;
  accent: ReturnType<typeof shotAccent>;
  canvasDraft: CanvasDraft;
  historyRecords: HistoryRecord[];
  hasDraftChange: boolean;
  activeStrokeCount: number;
  elementCount: number;
  updateCanvasZoom: (value: number) => void;
}

export function CreationCanvasEditorSidebar({
  controller,
  accent,
  canvasDraft,
  historyRecords,
  hasDraftChange,
  activeStrokeCount,
  elementCount,
  updateCanvasZoom,
}: CreationCanvasEditorSidebarProps) {
  return (
    <aside className={styles.sidePanel}>
      <section className={styles.panelSection}>
        <div className={styles.panelHeader}>
          <strong>生成记录</strong>
          <CreationIcon name="history" className={styles.panelHeaderIcon} />
        </div>
        <div className={styles.historyList}>
          {historyRecords.map((item) => (
            <div key={item.id} className={cx(styles.historyCard, item.id === 'current' && styles.historyCardActive)}>
              <div className={styles.historyPoster}>
                <ShotPoster shot={item.shot} size="version" accent={accent} showCaption={false} showTag={false} />
              </div>
              <div className={styles.historyMeta}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panelSection}>
        <div className={styles.panelHeader}>
          <strong>构图调整</strong>
          <span className={styles.panelHint}>{hasDraftChange ? '有未应用修改' : '与当前分镜一致'}</span>
        </div>
        <div className={styles.inspectorGroup}>
          <div className={styles.inlineChipRow}>
            {RATIO_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={cx(styles.optionChip, canvasDraft.ratio === item && styles.optionChipActive)}
                onClick={() => controller.setCanvasField('ratio', item)}
              >
                {item}
              </button>
            ))}
          </div>

          <label className={styles.inspectorField}>
            <span>{`缩放 ${canvasDraft.zoom}%`}</span>
            <input type="range" min={TRANSFORM_ZOOM_MIN} max={TRANSFORM_ZOOM_MAX} value={canvasDraft.zoom} onChange={(event) => updateCanvasZoom(Number(event.target.value))} />
          </label>

          <label className={styles.inspectorField}>
            <span>{`水平偏移 ${canvasDraft.offsetX}px`}</span>
            <input type="range" min="-160" max="160" value={canvasDraft.offsetX} onChange={(event) => controller.setCanvasField('offsetX', Number(event.target.value))} />
          </label>

          <label className={styles.inspectorField}>
            <span>{`垂直偏移 ${canvasDraft.offsetY}px`}</span>
            <input type="range" min="-160" max="160" value={canvasDraft.offsetY} onChange={(event) => controller.setCanvasField('offsetY', Number(event.target.value))} />
          </label>
        </div>
      </section>

      <section className={styles.panelSection}>
        <div className={styles.panelHeader}>
          <strong>当前会话</strong>
          <span className={styles.panelHint}>{`笔触 ${activeStrokeCount} · 元素 ${elementCount}`}</span>
        </div>
        <div className={styles.sessionList}>
          <div className={styles.sessionItem}>
            <span>拖拽画布</span>
            <small>在预览区直接拖拽调整构图，滚轮缩放内容。</small>
          </div>
          <div className={styles.sessionItem}>
            <span>局部重绘</span>
            <small>已复刻笔刷与撤销交互，当前不调用真实图像编辑后端。</small>
          </div>
          <div className={styles.sessionItem}>
            <span>元素添加</span>
            <small>点击画布可落点，用于先复刻源站的操作流。</small>
          </div>
        </div>
      </section>
    </aside>
  );
}
