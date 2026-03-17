import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';
import { fetchServerListOrEmpty, fetchServerValueOrNull } from '@/lib/server-fetch-fallback';

import type { CatalogStyleItem, CatalogSubjectItem, SettingsAuthUser } from './catalog-management-api';

export async function fetchCatalogSubjects(scope: 'all' | 'public' | 'personal' = 'all'): Promise<CatalogSubjectItem[]> {
  return fetchServerListOrEmpty(() => requestAivApiFromServer<CatalogSubjectItem[]>(`/api/explore/subjects?scope=${encodeURIComponent(scope)}`));
}

export async function fetchCatalogStyles(scope: 'all' | 'public' | 'personal' = 'all'): Promise<CatalogStyleItem[]> {
  return fetchServerListOrEmpty(() => requestAivApiFromServer<CatalogStyleItem[]>(`/api/explore/styles?scope=${encodeURIComponent(scope)}`));
}

export async function fetchCatalogSettingsAuthUser(): Promise<SettingsAuthUser | null> {
  return fetchServerValueOrNull(() => requestAivApiFromServer<SettingsAuthUser>('/api/auth/me'));
}
