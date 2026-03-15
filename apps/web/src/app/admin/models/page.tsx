import { AdminModelDirectoryPage } from '@/features/admin/components/admin-model-directory-page';
import { fetchAdminModelEndpoints } from '@/features/admin/lib/admin-models-api.server';

export default async function AdminModelsPage() {
  const endpoints = await fetchAdminModelEndpoints();
  return <AdminModelDirectoryPage endpoints={endpoints} />;
}
