export async function fetchServerValueOrFallback<T>(
  loader: () => Promise<T | null | undefined>,
  fallback: T,
): Promise<T> {
  try {
    return (await loader()) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchServerValueOrNull<T>(
  loader: () => Promise<T | null | undefined>,
): Promise<T | null> {
  return fetchServerValueOrFallback(loader, null);
}

export async function fetchServerListOrEmpty<T>(
  loader: () => Promise<T[] | null | undefined>,
): Promise<T[]> {
  return fetchServerValueOrFallback(loader, []);
}

export async function fetchServerValueOrHandledError<T, E>(
  loader: () => Promise<T | null | undefined>,
  onError: (error: unknown) => E,
  onSuccess: (value: T | null) => E,
): Promise<E> {
  try {
    return onSuccess((await loader()) ?? null);
  } catch (error) {
    return onError(error);
  }
}
