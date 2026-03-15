import 'server-only';

import { requestAivApiFromServer } from '@/lib/aiv-api';

export interface SharedAuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export async function fetchCurrentAuthUser(): Promise<SharedAuthUser | null> {
  try {
    return (await requestAivApiFromServer<SharedAuthUser>('/api/auth/me')) ?? null;
  } catch {
    return null;
  }
}
