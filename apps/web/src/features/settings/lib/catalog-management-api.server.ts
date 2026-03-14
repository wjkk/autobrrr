import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';

import type { CatalogStyleItem, CatalogSubjectItem, SettingsAuthUser } from './catalog-management-api';

export async function fetchCatalogSubjects(): Promise<CatalogSubjectItem[]> {
  try {
    return (await requestAivApiFromServer<CatalogSubjectItem[]>('/api/explore/subjects?scope=all')) ?? [];
  } catch {
    return [];
  }
}

export async function fetchCatalogStyles(): Promise<CatalogStyleItem[]> {
  try {
    return (await requestAivApiFromServer<CatalogStyleItem[]>('/api/explore/styles?scope=all')) ?? [];
  } catch {
    return [];
  }
}

export async function fetchCatalogSettingsAuthUser(): Promise<SettingsAuthUser | null> {
  try {
    return (await requestAivApiFromServer<SettingsAuthUser>('/api/auth/me')) ?? null;
  } catch {
    return null;
  }
}
