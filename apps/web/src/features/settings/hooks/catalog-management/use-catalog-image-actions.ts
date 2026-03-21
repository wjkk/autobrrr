import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { nextImageFeedbackTone } from '../../components/catalog-management-page-helpers';
import { generateCatalogSubjectImage, uploadCatalogSubjectImage } from '../../lib/catalog-management-client';
import type { SubjectDraft } from '../../components/catalog-management-editor-types';

interface UseCatalogImageActionsOptions {
  subjectDraft: SubjectDraft;
  setSubjectDraft: Dispatch<SetStateAction<SubjectDraft>>;
}

export function useCatalogImageActions({ subjectDraft, setSubjectDraft }: UseCatalogImageActionsOptions) {
  const previousSubjectImageUrlRef = useRef('');
  const [subjectImageMode, setSubjectImageMode] = useState<'upload' | 'ai'>('upload');
  const [subjectImagePrompt, setSubjectImagePrompt] = useState('');
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageFeedbackError, setImageFeedbackError] = useState(false);
  const [imagePreviewPulse, setImagePreviewPulse] = useState(false);

  const imageFeedbackTone = nextImageFeedbackTone(imageFeedback, imageFeedbackError);

  useEffect(() => {
    if (!imageFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setImageFeedback('');
      setImageFeedbackError(false);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [imageFeedback]);

  useEffect(() => {
    const nextImageUrl = subjectDraft.imageUrl.trim();
    if (!nextImageUrl || !previousSubjectImageUrlRef.current || previousSubjectImageUrlRef.current === nextImageUrl) {
      previousSubjectImageUrlRef.current = nextImageUrl;
      return;
    }

    previousSubjectImageUrlRef.current = nextImageUrl;
    setImagePreviewPulse(true);
    const timer = window.setTimeout(() => setImagePreviewPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [subjectDraft.imageUrl]);

  const triggerImageFeedback = (message: string, isError = false) => {
    setImageFeedback(message);
    setImageFeedbackError(isError);
  };

  const resetImageState = () => {
    setSubjectImageMode('upload');
    setSubjectImagePrompt('');
    setImageFeedback('');
    setImageFeedbackError(false);
  };

  const handleSubjectImageUpload = async (file: File) => {
    setImageSubmitting(true);
    triggerImageFeedback('正在上传主体图...');
    try {
      const imageUrl = await uploadCatalogSubjectImage(file);
      setSubjectDraft((current) => ({ ...current, imageUrl }));
      triggerImageFeedback('主体图已上传，可继续保存主体。');
    } catch (error) {
      triggerImageFeedback(error instanceof Error ? error.message : '上传主体图失败。', true);
    } finally {
      setImageSubmitting(false);
    }
  };

  const handleSubjectImageGeneration = async () => {
    setImageSubmitting(true);
    triggerImageFeedback('正在生成主体图...');
    try {
      const description = subjectImagePrompt.trim() || subjectDraft.description.trim();
      if (!subjectDraft.name.trim() || !description) {
        throw new Error('请先填写主体名称和描述，再生成主体图。');
      }

      const imageUrl = await generateCatalogSubjectImage({
        name: subjectDraft.name.trim(),
        subjectType: subjectDraft.subjectType,
        description,
      });
      setSubjectDraft((current) => ({ ...current, imageUrl }));
      triggerImageFeedback('AI 主体图已生成，可继续保存主体。');
    } catch (error) {
      triggerImageFeedback(error instanceof Error ? error.message : 'AI 生成主体图失败。', true);
    } finally {
      setImageSubmitting(false);
    }
  };

  return {
    subjectImageMode,
    setSubjectImageMode,
    subjectImagePrompt,
    setSubjectImagePrompt,
    imageSubmitting,
    imageFeedback,
    imageFeedbackTone,
    imagePreviewPulse,
    resetImageState,
    handleSubjectImageUpload,
    handleSubjectImageGeneration,
  };
}
