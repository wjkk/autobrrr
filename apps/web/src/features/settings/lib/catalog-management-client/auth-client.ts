import type { SettingsAuthUser } from '../catalog-management-api';
import { requestCatalogEnvelope } from './request';

export interface CatalogAuthInput {
  mode: 'login' | 'register';
  email: string;
  password: string;
  displayName: string;
}

export async function fetchCatalogCurrentUser() {
  try {
    return await requestCatalogEnvelope<SettingsAuthUser>('/api/auth/me', {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return null;
  }
}

export async function authenticateCatalogUser(input: CatalogAuthInput) {
  if (input.mode === 'register') {
    await requestCatalogEnvelope<SettingsAuthUser>('/api/auth/register', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        ...(input.displayName.trim() ? { displayName: input.displayName.trim() } : {}),
      }),
    });
  }

  await requestCatalogEnvelope<SettingsAuthUser>('/api/auth/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });

  return fetchCatalogCurrentUser();
}

export async function logoutCatalogUser() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
}
