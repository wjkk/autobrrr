import type { CatalogStyleItem, CatalogSubjectItem } from '../catalog-management-api';
import { requestCatalogEnvelope } from './request';

export interface CatalogCollectionPayload {
  subjects: CatalogSubjectItem[];
  styles: CatalogStyleItem[];
}

export async function fetchCatalogCollections(publicOnly: boolean): Promise<CatalogCollectionPayload> {
  const scope = publicOnly ? 'public' : 'all';
  const [subjects, styles] = await Promise.all([
    requestCatalogEnvelope<CatalogSubjectItem[]>(`/api/explore/subjects?scope=${scope}`, {
      headers: { Accept: 'application/json' },
    }),
    requestCatalogEnvelope<CatalogStyleItem[]>(`/api/explore/styles?scope=${scope}`, {
      headers: { Accept: 'application/json' },
    }),
  ]);

  return { subjects, styles };
}
