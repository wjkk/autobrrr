const LOCAL_MEDIA_BASE = '/seko-creation';
const LOCAL_MEDIA_COUNT = 14;

function padIndex(value: number) {
  return String(value).padStart(2, '0');
}

function normalizeIndex(rawIndex: number) {
  const safeIndex = Number.isFinite(rawIndex) && rawIndex > 0 ? rawIndex : 1;
  return ((safeIndex - 1) % LOCAL_MEDIA_COUNT) + 1;
}

const MISSING_SHOT_MEDIA = new Set(['shot-2']);

export function getCreationShotMediaUrl(shotId: string) {
  if (MISSING_SHOT_MEDIA.has(shotId)) {
    return '';
  }
  const trailingDigits = shotId.match(/(\d+)(?!.*\d)/)?.[1];
  const index = normalizeIndex(Number(trailingDigits ?? 1));
  return `${LOCAL_MEDIA_BASE}/shot-${padIndex(index)}.jpg`;
}

export function getCreationShotSummaryMediaUrl(shotId: string) {
  if (shotId === 'shot-1') {
    return `${LOCAL_MEDIA_BASE}/shot-01-strip.jpg`;
  }

  return getCreationShotMediaUrl(shotId);
}

export function getCreationVersionMediaUrl(shotId: string, versionId: string) {
  const versionDigits = versionId.match(/(\d+)(?!.*\d)/)?.[1];
  const shotDigits = shotId.match(/(\d+)(?!.*\d)/)?.[1];
  const baseIndex = Number(shotDigits ?? 1);
  const offset = Number(versionDigits ?? 1) - 1;

  return `${LOCAL_MEDIA_BASE}/shot-${padIndex(normalizeIndex(baseIndex + offset))}.jpg`;
}
