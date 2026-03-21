import { parseApiEnvelope } from '../../components/catalog-management-page-helpers';

export async function requestCatalogEnvelope<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = parseApiEnvelope<T>(await response.json());

  if (!response.ok || !payload.ok) {
    throw new Error(!payload.ok ? payload.error.message ?? 'Request failed.' : 'Request failed.');
  }

  return payload.data;
}
