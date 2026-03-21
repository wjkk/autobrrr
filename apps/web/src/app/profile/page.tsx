import { ProfilePage } from '@/features/profile/components/profile-page';
import { fetchMySpaceProjects } from '@/features/my-space/lib/my-space-api.server';
import { fetchProviderConfigs } from '@/features/settings/lib/provider-config-api.server';
import { fetchCurrentAuthUser } from '@/features/shared/lib/auth-user.server';

export default async function UserProfilePage() {
  const currentUser = await fetchCurrentAuthUser();
  if (!currentUser) {
    return <ProfilePage currentUser={null} projects={[]} providerConfigs={[]} authRequired />;
  }

  const [{ projects, error }, providerConfigs] = await Promise.all([
    fetchMySpaceProjects(),
    fetchProviderConfigs(),
  ]);

  return (
    <ProfilePage
      currentUser={currentUser}
      projects={projects}
      providerConfigs={providerConfigs}
      projectsError={error}
    />
  );
}
