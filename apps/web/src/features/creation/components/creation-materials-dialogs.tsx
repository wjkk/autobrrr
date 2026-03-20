'use client';

import { Button, cx } from '@aiv/ui';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import type { CreationWorkspaceController } from '../lib/use-creation-workspace';
import { CreationModalShell } from './creation-modal-shell';
import { ShotPoster } from './shot-poster';
import dialogStyles from './creation-dialogs.module.css';

export function CreationMaterialsDialogs(props: {
  controller: CreationWorkspaceController;
}) {
  const { controller } = props;
  const { dialog, studio, activeShot } = controller;
  const [historyCategory, setHistoryCategory] = useState<(typeof studio.explore.categories)[number]>('全部');
  const [selectedHistoryWorkId, setSelectedHistoryWorkId] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [cropRatio, setCropRatio] = useState<'自由' | '9:16' | '16:9' | '3:4' | '4:3'>('自由');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const filteredHistoryWorks = studio.historyWorks.filter((item) => historyCategory === '全部' || item.category === historyCategory);
  const selectedHistoryWork = filteredHistoryWorks.find((item) => item.id === selectedHistoryWorkId) ?? studio.historyWorks.find((item) => item.id === selectedHistoryWorkId) ?? null;

  useEffect(() => {
    if (dialog.type === 'materials') {
      setHistoryCategory('全部');
      setSelectedHistoryWorkId(null);
    }
  }, [dialog.type]);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  if (!activeShot) {
    return null;
  }

  const handleUploadImage = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 300 || image.naturalHeight < 300) {
        controller.setDialog({ type: 'none' });
        controller.setNotice(`图片最小尺寸为 300*300，当前图片尺寸为 ${image.naturalWidth}*${image.naturalHeight}`);
        URL.revokeObjectURL(objectUrl);
        event.target.value = '';
        return;
      }

      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
      setUploadedImageName(file.name);
      setUploadedImageUrl(objectUrl);
      setCropRatio('自由');
      controller.setDialog({ type: 'none' });
      setCropOpen(true);
      event.target.value = '';
    };
    image.onerror = () => {
      controller.setNotice('图片读取失败，请重试。');
      URL.revokeObjectURL(objectUrl);
      event.target.value = '';
    };
    image.src = objectUrl;
  };

  const applyHistoryWork = () => {
    if (!selectedHistoryWork) {
      return;
    }
    controller.attachHistoryMaterial(selectedHistoryWork.title);
  };

  const applyUploadedImage = () => {
    controller.applyUploadedMaterial(uploadedImageName);
    setCropOpen(false);
  };

  return (
    <>
      <CreationModalShell
        open={dialog.type === 'materials'}
        eyebrow="History"
        title="从历史创作中选择"
        description="仅展示已导出成片的视频作品。"
        size="wide"
        onClose={() => controller.setDialog({ type: 'none' })}
        footerInfo={<span className={dialogStyles.historyPickerHint}>仅展示已导出成片的视频作品</span>}
        footerActions={
          <>
            <input ref={uploadInputRef} className={dialogStyles.hiddenUploadInput} type="file" accept="image/*" onChange={handleUploadChange} />
            <Button variant="secondary" onClick={handleUploadImage}>
              上传图片
            </Button>
            <Button onClick={applyHistoryWork} disabled={!selectedHistoryWork}>
              选择作品
            </Button>
          </>
        }
      >
        <div className={dialogStyles.historyPickerLayout}>
          <div className={dialogStyles.historyCategoryTabs}>
            {studio.explore.categories.map((item) => (
              <button
                key={item}
                type="button"
                className={cx(dialogStyles.historyCategoryTab, historyCategory === item && dialogStyles.historyCategoryTabActive)}
                onClick={() => setHistoryCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className={dialogStyles.historyWorksGrid}>
            {filteredHistoryWorks.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(dialogStyles.historyWorkCard, selectedHistoryWorkId === item.id && dialogStyles.historyWorkCardActive)}
                onClick={() => setSelectedHistoryWorkId(item.id)}
              >
                <div className={dialogStyles.historyWorkPoster}>
                  <span className={dialogStyles.historyWorkPosterLabel}>{item.coverLabel}</span>
                </div>
                <div className={dialogStyles.historyWorkMeta}>
                  <strong>{item.title}</strong>
                  <small>{item.durationLabel}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CreationModalShell>

      <CreationModalShell
        open={cropOpen}
        title="裁剪图片"
        description="上传后先确认裁剪比例，再应用到当前分镜。"
        size="wide"
        onClose={() => setCropOpen(false)}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setCropOpen(false)}>
              取消
            </Button>
            <Button onClick={applyUploadedImage}>应用</Button>
          </>
        }
      >
        <div className={dialogStyles.cropLayout}>
          <div className={dialogStyles.cropPreviewSurface}>
            <div className={dialogStyles.cropPreviewFrame}>
              <div className={dialogStyles.cropPreviewInner}>
                {uploadedImageUrl ? (
                  <img className={dialogStyles.cropPreviewImage} src={uploadedImageUrl} alt={uploadedImageName || '上传图片预览'} />
                ) : (
                  <ShotPoster shot={activeShot} size="stage" accent={controller.shotAccent(activeShot.id)} className={dialogStyles.cropPreviewPoster} showCaption={false} showTag={false} />
                )}
              </div>
            </div>
          </div>
          <div className={dialogStyles.cropRatioRow}>
            {(['自由', '9:16', '16:9', '3:4', '4:3'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(dialogStyles.cropRatioChip, cropRatio === item && dialogStyles.cropRatioChipActive)}
                onClick={() => setCropRatio(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </CreationModalShell>
    </>
  );
}
