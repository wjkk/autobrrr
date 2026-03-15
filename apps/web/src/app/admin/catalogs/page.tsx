import { CatalogManagementPage } from '@/features/settings/components/catalog-management-page';
import { fetchCatalogSettingsAuthUser, fetchCatalogStyles, fetchCatalogSubjects } from '@/features/settings/lib/catalog-management-api.server';

export default async function AdminCatalogsPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const initialTab = searchParams.tab === 'styles' ? 'styles' : 'subjects';
  const [currentUser, subjects, styles] = await Promise.all([
    fetchCatalogSettingsAuthUser(),
    fetchCatalogSubjects('public'),
    fetchCatalogStyles('public'),
  ]);

  return (
    <CatalogManagementPage
      currentUser={currentUser}
      initialSubjects={subjects}
      initialStyles={styles}
      initialTab={initialTab}
      mode="admin"
      scopeMode="publicOnly"
    />
  );
}
