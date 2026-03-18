import type { ApiPlannerAssetOption, ApiPlannerEntityRecommendation } from './planner-api';

export function pickPlannerRecommendationPreviewAsset(
  recommendation: ApiPlannerEntityRecommendation,
): ApiPlannerAssetOption | null {
  return recommendation.referenceAssets.find((asset) => Boolean(asset.sourceUrl)) ?? null;
}

export function applyPlannerRecommendationDraft(
  recommendation: ApiPlannerEntityRecommendation,
) {
  const previewAsset = pickPlannerRecommendationPreviewAsset(recommendation);

  return {
    prompt: recommendation.prompt,
    assetId: previewAsset?.id ?? null,
    image: previewAsset?.sourceUrl ?? '',
    promptMode: 'ai' as const,
  };
}
