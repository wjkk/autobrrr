import { ExplorePage } from '@/features/explore/components/explore-page';

interface ExploreRouteProps {
  searchParams?: Promise<{ subject?: string }>;
}

export default async function ExploreRoute({ searchParams }: ExploreRouteProps) {
  const params = (await searchParams) ?? {};
  return <ExplorePage initialSubjectSlug={params.subject} />;
}
