import { ExplorePage } from '@/features/explore/components/explore-page';
import { fetchExploreStudio } from '@/lib/studio-service';

export default async function ExploreRoute() {
  const studio = await fetchExploreStudio();

  return <ExplorePage studio={studio} />;
}
