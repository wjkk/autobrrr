import { MySpacePage } from '@/features/my-space/components/my-space-page';
import { fetchMySpaceProjects } from '@/features/my-space/lib/my-space-api.server';
import { fetchCurrentAuthUser } from '@/features/shared/lib/auth-user.server';

export default async function MySpaceRoute() {
  const currentUser = await fetchCurrentAuthUser();
  if (!currentUser) {
    return <MySpacePage projects={[]} authRequired />;
  }

  const { projects, error } = await fetchMySpaceProjects();
  return <MySpacePage projects={projects} error={error} />;
}
