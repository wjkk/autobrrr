'use client';

import { useEffect, useState } from 'react';

import type { CreationRuntimeApiContext } from './creation-api';
import { requestCreationApi, type ApiModelEndpoint } from './creation-runtime-api';

export interface RuntimeModelCatalogState {
  image: ApiModelEndpoint[];
  video: ApiModelEndpoint[];
}

export function useCreationRuntimeModelCatalog(runtimeApi?: CreationRuntimeApiContext) {
  const [runtimeModelCatalog, setRuntimeModelCatalog] = useState<RuntimeModelCatalogState>({
    image: [],
    video: [],
  });

  useEffect(() => {
    if (!runtimeApi) {
      return;
    }

    let canceled = false;

    void Promise.all([
      requestCreationApi<ApiModelEndpoint[]>('/api/model-endpoints?modelKind=image'),
      requestCreationApi<ApiModelEndpoint[]>('/api/model-endpoints?modelKind=video'),
    ])
      .then(([image, video]) => {
        if (canceled) {
          return;
        }
        setRuntimeModelCatalog({ image, video });
      })
      .catch(() => {
        if (canceled) {
          return;
        }
        setRuntimeModelCatalog({ image: [], video: [] });
      });

    return () => {
      canceled = true;
    };
  }, [runtimeApi]);

  return runtimeModelCatalog;
}
