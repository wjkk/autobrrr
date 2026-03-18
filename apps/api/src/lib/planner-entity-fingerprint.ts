function normalizeSemanticText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u3000\s]+/gu, ' ')
    .replace(/[“”"'`~!@#$%^&*()_+\-=[\]{};:|,.<>/?，。！？；：、（）【】《》…]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCjkSegment(value: string) {
  return /^[\p{Script=Han}]+$/u.test(value);
}

function extractSemanticTokens(values: Array<string | null | undefined>) {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const pushToken = (value: string) => {
    const token = value.trim();
    if (token.length < 2 || seen.has(token)) {
      return;
    }
    seen.add(token);
    tokens.push(token);
  };

  for (const value of values) {
    const normalized = value ? normalizeSemanticText(value) : '';
    if (!normalized) {
      continue;
    }

    for (const segment of normalized.split(' ')) {
      if (!segment) {
        continue;
      }

      pushToken(segment);

      if (isCjkSegment(segment) && segment.length >= 4) {
        for (let index = 0; index < segment.length - 1 && index < 10; index += 1) {
          pushToken(segment.slice(index, index + 2));
        }
      }
    }
  }

  return tokens;
}

export function buildPlannerEntityFingerprint(args: {
  title?: string | null;
  prompt?: string | null;
}) {
  return extractSemanticTokens([args.title, args.prompt]).slice(0, 12).join('|');
}

export function scorePlannerEntitySimilarity(args: {
  currentTitle?: string | null;
  currentPrompt?: string | null;
  currentFingerprint?: string | null;
  previousTitle?: string | null;
  previousPrompt?: string | null;
  previousFingerprint?: string | null;
}) {
  const currentFingerprint = args.currentFingerprint?.trim() || buildPlannerEntityFingerprint({
    title: args.currentTitle,
    prompt: args.currentPrompt,
  });
  const previousFingerprint = args.previousFingerprint?.trim() || buildPlannerEntityFingerprint({
    title: args.previousTitle,
    prompt: args.previousPrompt,
  });

  if (!currentFingerprint || !previousFingerprint) {
    return 0;
  }

  const currentTokens = currentFingerprint.split('|').filter((token) => token.length > 0);
  const previousTokens = new Set(previousFingerprint.split('|').filter((token) => token.length > 0));
  let overlap = 0;

  for (const token of currentTokens) {
    if (previousTokens.has(token)) {
      overlap += 1;
    }
  }

  const currentTitle = normalizeSemanticText(args.currentTitle ?? '');
  const previousTitle = normalizeSemanticText(args.previousTitle ?? '');

  return overlap * 4 + (currentTitle && currentTitle === previousTitle ? 10 : 0);
}

export const __testables = {
  normalizeSemanticText,
  extractSemanticTokens,
};
