import { useState } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { CatalogCollectionPayload } from '../../lib/catalog-management-client/query-client';
import type { CatalogStyleItem, CatalogSubjectItem } from '../../lib/catalog-management-api';
import { makeEmptyStyleDraft, makeEmptySubjectDraft, styleToDraft, subjectToDraft } from '../../lib/catalog-management-drafts';
import type { StyleDraft, SubjectDraft } from '../../components/catalog-management-editor-types';

interface UseCatalogEditorStateOptions {
  initialSubjects: CatalogSubjectItem[];
  initialStyles: CatalogStyleItem[];
  router: AppRouterInstance;
}

export function useCatalogEditorState({ initialSubjects, initialStyles, router }: UseCatalogEditorStateOptions) {
  const [subjects, setSubjects] = useState<CatalogSubjectItem[]>(initialSubjects);
  const [stylesList, setStylesList] = useState<CatalogStyleItem[]>(initialStyles);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjects[0]?.id ?? null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(initialStyles[0]?.id ?? null);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(() => initialSubjects[0] ? subjectToDraft(initialSubjects[0]) : makeEmptySubjectDraft());
  const [styleDraft, setStyleDraft] = useState<StyleDraft>(() => initialStyles[0] ? styleToDraft(initialStyles[0]) : makeEmptyStyleDraft());
  const [editorOpen, setEditorOpen] = useState(false);

  const applyCollections = (nextCollections: CatalogCollectionPayload) => {
    setSubjects(nextCollections.subjects);
    setStylesList(nextCollections.styles);

    if (nextCollections.subjects.length > 0 && !nextCollections.subjects.some((item) => item.id === selectedSubjectId)) {
      setSelectedSubjectId(nextCollections.subjects[0].id);
      setSubjectDraft(subjectToDraft(nextCollections.subjects[0]));
    }

    if (nextCollections.styles.length > 0 && !nextCollections.styles.some((item) => item.id === selectedStyleId)) {
      setSelectedStyleId(nextCollections.styles[0].id);
      setStyleDraft(styleToDraft(nextCollections.styles[0]));
    }
  };

  const resetCollections = () => {
    setSubjects([]);
    setStylesList([]);
    setSelectedSubjectId(null);
    setSelectedStyleId(null);
  };

  const selectSubject = (item: CatalogSubjectItem) => {
    setSelectedSubjectId(item.id);
    setSubjectDraft(subjectToDraft(item));
    setEditorOpen(true);
  };

  const selectStyle = (item: CatalogStyleItem) => {
    setSelectedStyleId(item.id);
    setStyleDraft(styleToDraft(item));
    setEditorOpen(true);
  };

  const startNew = (renderingSubjects: boolean) => {
    if (renderingSubjects) {
      setSelectedSubjectId(null);
      setSubjectDraft(makeEmptySubjectDraft());
    } else {
      setSelectedStyleId(null);
      setStyleDraft(makeEmptyStyleDraft());
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const useSubjectForCreation = (triggerFeedback: (message: string, isError?: boolean) => void) => {
    if (!subjectDraft.slug.trim()) {
      triggerFeedback('请先保存主体后再使用主体创作。', true);
      return;
    }

    closeEditor();
    router.push(`/explore?subject=${encodeURIComponent(subjectDraft.slug.trim())}`);
  };

  return {
    subjects,
    stylesList,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedStyleId,
    setSelectedStyleId,
    subjectDraft,
    setSubjectDraft,
    styleDraft,
    setStyleDraft,
    editorOpen,
    applyCollections,
    resetCollections,
    selectSubject,
    selectStyle,
    startNew,
    closeEditor,
    useSubjectForCreation,
  };
}
