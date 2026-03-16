const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL ?? `smoke-ark-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD ?? 'password123';
const arkApiKey = process.env.SMOKE_ARK_API_KEY ?? process.env.ARK_API_KEY ?? '';

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

interface ProviderConfigItem {
  provider: {
    code: string;
    name: string;
  };
  endpoints: Array<{
    slug: string;
    modelKind: string;
    label: string;
  }>;
  userConfig: {
    catalogSync: {
      status: string | null;
      message: string | null;
      syncedAt: string | null;
      modelCount: number | null;
    };
    defaults: {
      textEndpointSlug: string | null;
      imageEndpointSlug: string | null;
      videoEndpointSlug: string | null;
      audioEndpointSlug: string | null;
    };
    enabledModels: {
      textEndpointSlugs: string[];
      imageEndpointSlugs: string[];
      videoEndpointSlugs: string[];
      audioEndpointSlugs: string[];
    };
  };
}

async function request<T>(path: string, init?: RequestInit & { cookie?: string }) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      ...(init?.cookie ? { Cookie: init.cookie } : {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ApiFailure;
    throw new Error(`${path} failed: ${errorPayload.error?.code ?? response.status} ${errorPayload.error?.message ?? 'Unknown error'}`);
  }

  return {
    data: payload.data,
    setCookie: response.headers.get('set-cookie'),
  };
}

function requireCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    throw new Error('Missing set-cookie header from login response.');
  }

  return setCookieHeader.split(';', 1)[0] ?? '';
}

function countByKind(config: ProviderConfigItem) {
  return config.endpoints.reduce(
    (accumulator, endpoint) => ({
      ...accumulator,
      [endpoint.modelKind]: accumulator[endpoint.modelKind] + 1,
    }),
    { text: 0, image: 0, video: 0, audio: 0 } as Record<string, number>,
  );
}

async function main() {
  if (!arkApiKey.trim()) {
    throw new Error('SMOKE_ARK_API_KEY or ARK_API_KEY is required.');
  }

  console.log(`[smoke:ark-sync] API base: ${apiBaseUrl}`);
  console.log(`[smoke:ark-sync] email: ${email}`);

  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      displayName: 'Smoke Ark Sync',
    }),
  });

  const login = await request<{ id: string; email: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const cookie = requireCookie(login.setCookie);

  await request(`/api/provider-configs/${encodeURIComponent('ark')}`, {
    method: 'PUT',
    cookie,
    body: JSON.stringify({
      apiKey: arkApiKey.trim(),
      enabled: true,
      defaults: {
        textEndpointSlug: null,
        imageEndpointSlug: null,
        videoEndpointSlug: null,
        audioEndpointSlug: null,
      },
      enabledModels: {
        textEndpointSlugs: [],
        imageEndpointSlugs: [],
        videoEndpointSlugs: [],
        audioEndpointSlugs: [],
      },
    }),
  });
  console.log('[smoke:ark-sync] provider config saved');

  const synced = await request<ProviderConfigItem>(`/api/provider-configs/${encodeURIComponent('ark')}/sync-models`, {
    method: 'POST',
    cookie,
  });
  console.log('[smoke:ark-sync] sync-models ok');

  if (synced.data.userConfig.catalogSync.status !== 'passed') {
    throw new Error('Ark catalog sync did not finish with passed status.');
  }

  const counts = countByKind(synced.data);
  if (counts.text <= 0) {
    throw new Error('Ark sync did not produce any text models.');
  }
  if (counts.image <= 0) {
    throw new Error('Ark sync did not produce any image models.');
  }
  if (counts.video <= 0) {
    throw new Error('Ark sync did not produce any video models.');
  }

  console.log(`[smoke:ark-sync] synced counts: text=${counts.text} image=${counts.image} video=${counts.video} audio=${counts.audio}`);

  const list = await request<ProviderConfigItem[]>('/api/provider-configs', {
    cookie,
  });
  const arkConfig = list.data.find((item) => item.provider.code === 'ark');
  if (!arkConfig) {
    throw new Error('Ark provider config not found in list response.');
  }
  if (arkConfig.userConfig.catalogSync.status !== 'passed') {
    throw new Error('Ark provider list response does not show synced status.');
  }

  console.log('[smoke:ark-sync] provider list reflects synced ark config');
}

main().catch((error) => {
  console.error('[smoke:ark-sync] failed');
  console.error(error);
  process.exitCode = 1;
});
