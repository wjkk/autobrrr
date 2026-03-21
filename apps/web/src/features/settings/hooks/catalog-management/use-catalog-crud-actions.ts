import { useState, type Dispatch, type SetStateAction } from 'react';

import { saveCatalogStyle, saveCatalogSubject } from '../../lib/catalog-management-client';
import { styleToDraft, subjectToDraft } from '../../lib/catalog-management-drafts';
import type { StyleDraft, SubjectDraft } from '../../components/catalog-management-editor-types';

interface UseCatalogCrudActionsOptions {
  publicOnly: boolean;
  subjectDraft: SubjectDraft;
  styleDraft: StyleDraft;
  syncCatalogCollections: () => Promise<void>;
  setSelectedSubjectId: Dispatch<SetStateAction<string | null>>;
  setSubjectDraft: Dispatch<SetStateAction<SubjectDraft>>;
  setSelectedStyleId: Dispatch<SetStateAction<string | null>>;
  setStyleDraft: Dispatch<SetStateAction<StyleDraft>>;
  triggerFeedback: (message: string, isError?: boolean) => void;
}

export function useCatalogCrudActions(options: UseCatalogCrudActionsOptions) {
  const [saving, setSaving] = useState(false);

  const handleSubjectSave = async () => {
    setSaving(true);
    try {
      const subject = await saveCatalogSubject({ draft: options.subjectDraft, publicOnly: options.publicOnly });
      await options.syncCatalogCollections();
      options.setSelectedSubjectId(subject.id);
      options.setSubjectDraft(subjectToDraft(subject));
      options.triggerFeedback(`主体已保存：${subject.name}`);
    } catch (error) {
      options.triggerFeedback(error instanceof Error ? error.message : '保存主体失败。', true);
    } finally {
      setSaving(false);
    }
  };

  const handleStyleSave = async () => {
    setSaving(true);
    try {
      const style = await saveCatalogStyle({ draft: options.styleDraft, publicOnly: options.publicOnly });
      await options.syncCatalogCollections();
      options.setSelectedStyleId(style.id);
      options.setStyleDraft(styleToDraft(style));
      options.triggerFeedback(`画风已保存：${style.name}`);
    } catch (error) {
      options.triggerFeedback(error instanceof Error ? error.message : '保存画风失败。', true);
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleSubjectSave,
    handleStyleSave,
  };
}
