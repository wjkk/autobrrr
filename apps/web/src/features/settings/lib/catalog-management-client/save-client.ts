import type { CatalogStyleItem, CatalogSubjectItem } from '../catalog-management-api';
import type { StyleDraft, SubjectDraft } from '../../components/catalog-management-editor-types';
import { toCatalogStylePayload, toCatalogSubjectPayload } from '../catalog-management-drafts';
import { requestCatalogEnvelope } from './request';

export async function saveCatalogSubject(input: {
  draft: SubjectDraft;
  publicOnly: boolean;
}) {
  const { draft, publicOnly } = input;
  return requestCatalogEnvelope<CatalogSubjectItem>(
    draft.id ? `/api/explore/subjects/${encodeURIComponent(draft.id)}` : '/api/explore/subjects',
    {
      method: draft.id ? 'PATCH' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toCatalogSubjectPayload(draft, publicOnly)),
    },
  );
}

export async function saveCatalogStyle(input: {
  draft: StyleDraft;
  publicOnly: boolean;
}) {
  const { draft, publicOnly } = input;
  return requestCatalogEnvelope<CatalogStyleItem>(
    draft.id ? `/api/explore/styles/${encodeURIComponent(draft.id)}` : '/api/explore/styles',
    {
      method: draft.id ? 'PATCH' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toCatalogStylePayload(draft, publicOnly)),
    },
  );
}
