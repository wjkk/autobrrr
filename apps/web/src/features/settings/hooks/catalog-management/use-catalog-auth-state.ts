import { useState } from 'react';

import type { SettingsAuthUser } from '../../lib/catalog-management-api';
import { authenticateCatalogUser, logoutCatalogUser } from '../../lib/catalog-management-client';

interface UseCatalogAuthStateOptions {
  initialUser: SettingsAuthUser | null;
  syncCatalogCollections: () => Promise<void>;
  resetCollections: () => void;
}

export function useCatalogAuthState({ initialUser, syncCatalogCollections, resetCollections }: UseCatalogAuthStateOptions) {
  const [currentUser, setCurrentUser] = useState<SettingsAuthUser | null>(initialUser);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('qa.local@aiv.dev');
  const [authPassword, setAuthPassword] = useState('AivLocal123!');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');

  const submitAuth = async () => {
    setAuthSubmitting(true);
    setAuthFeedback('');
    try {
      const nextUser = await authenticateCatalogUser({
        mode: authMode,
        email: authEmail,
        password: authPassword,
        displayName: authDisplayName,
      });

      setCurrentUser(nextUser);
      await syncCatalogCollections();
      setAuthFeedback(authMode === 'login' ? '登录成功。' : '注册并登录成功。');
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : '认证失败。');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const logout = async () => {
    await logoutCatalogUser();
    setCurrentUser(null);
    resetCollections();
  };

  return {
    currentUser,
    authMode,
    authEmail,
    authPassword,
    authDisplayName,
    authSubmitting,
    authFeedback,
    setAuthMode,
    setAuthEmail,
    setAuthPassword,
    setAuthDisplayName,
    submitAuth,
    logout,
  };
}
