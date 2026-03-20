'use client';

import { makeEmptyStyleDraft, makeEmptySubjectDraft } from './catalog-management-page-helpers';
import { CatalogStyleDialog } from './catalog-style-dialog';
import { CatalogSubjectDialog } from './catalog-subject-dialog';

interface CatalogManagementDialogsProps {
  renderingSubjects: boolean;
  editorOpen: boolean;
  subjectDraft: Parameters<typeof CatalogSubjectDialog>[0]['draft'];
  styleDraft: Parameters<typeof CatalogStyleDialog>[0]['draft'];
  saving: boolean;
  feedback: string;
  feedbackError: boolean;
  imageSubmitting: boolean;
  imageFeedback: string;
  imageFeedbackTone: Parameters<typeof CatalogSubjectDialog>[0]['imageFeedbackTone'];
  imageMode: Parameters<typeof CatalogSubjectDialog>[0]['imageMode'];
  imagePrompt: string;
  imagePreviewPulse: boolean;
  setSubjectDraft: Parameters<typeof CatalogSubjectDialog>[0]['onDraftChange'];
  setStyleDraft: Parameters<typeof CatalogStyleDialog>[0]['onDraftChange'];
  setImageMode: Parameters<typeof CatalogSubjectDialog>[0]['onImageModeChange'];
  setImagePrompt: Parameters<typeof CatalogSubjectDialog>[0]['onImagePromptChange'];
  onClose: () => void;
  onUseForCreation: () => void;
  onSaveSubject: () => void;
  onUploadImage: (file: File) => void;
  onGenerateImage: () => void;
  onSaveStyle: () => void;
}

export function CatalogManagementDialogs({
  renderingSubjects,
  editorOpen,
  subjectDraft,
  styleDraft,
  saving,
  feedback,
  feedbackError,
  imageSubmitting,
  imageFeedback,
  imageFeedbackTone,
  imageMode,
  imagePrompt,
  imagePreviewPulse,
  setSubjectDraft,
  setStyleDraft,
  setImageMode,
  setImagePrompt,
  onClose,
  onUseForCreation,
  onSaveSubject,
  onUploadImage,
  onGenerateImage,
  onSaveStyle,
}: CatalogManagementDialogsProps) {
  if (renderingSubjects) {
    return (
      <CatalogSubjectDialog
        open={editorOpen}
        draft={subjectDraft}
        saving={saving}
        feedback={feedback}
        feedbackError={feedbackError}
        imageSubmitting={imageSubmitting}
        imageFeedback={imageFeedback}
        imageFeedbackTone={imageFeedbackTone}
        imageMode={imageMode}
        imagePrompt={imagePrompt}
        imagePreviewPulse={imagePreviewPulse}
        onClose={onClose}
        onUseForCreation={onUseForCreation}
        onClear={() => setSubjectDraft(() => makeEmptySubjectDraft())}
        onSave={onSaveSubject}
        onDraftChange={setSubjectDraft}
        onImageModeChange={setImageMode}
        onImagePromptChange={setImagePrompt}
        onUploadImage={onUploadImage}
        onGenerateImage={onGenerateImage}
      />
    );
  }

  return (
    <CatalogStyleDialog
      open={editorOpen}
      draft={styleDraft}
      saving={saving}
      feedback={feedback}
      feedbackError={feedbackError}
      onClose={onClose}
      onClear={() => setStyleDraft(() => makeEmptyStyleDraft())}
      onSave={onSaveStyle}
      onDraftChange={setStyleDraft}
    />
  );
}
