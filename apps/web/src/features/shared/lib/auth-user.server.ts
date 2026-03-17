import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';
import { fetchServerValueOrNull } from '@/lib/server-fetch-fallback';

export interface SharedAuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export async function fetchCurrentAuthUser(): Promise<SharedAuthUser | null> {
  return fetchServerValueOrNull(() => requestAivApiFromServer<SharedAuthUser>('/api/auth/me'));
}
