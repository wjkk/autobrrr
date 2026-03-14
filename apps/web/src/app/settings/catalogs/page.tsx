import { CatalogManagementPage } from '@/features/settings/components/catalog-management-page';
import {
  fetchCatalogSettingsAuthUser,
  fetchCatalogStyles,
  fetchCatalogSubjects,
} from '@/features/settings/lib/catalog-management-api.server';

export default async function CatalogSettingsPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const initialTab = searchParams.tab === 'styles' ? 'styles' : 'subjects';
  const [currentUser, subjects, styles] = await Promise.all([
    fetchCatalogSettingsAuthUser(),
    fetchCatalogSubjects(),
    fetchCatalogStyles(),
  ]);

  return (
    <CatalogManagementPage
      currentUser={currentUser}
      initialSubjects={subjects}
      initialStyles={styles}
      initialTab={initialTab}
    />
  );
}
