import { MySpacePage } from '@/features/my-space/components/my-space-page';
import { fetchMySpaceProjects } from '@/features/my-space/lib/my-space-api.server';

export default async function MySpaceRoute() {
  const { projects, error } = await fetchMySpaceProjects();
  return <MySpacePage projects={projects} error={error} />;
}
