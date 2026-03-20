'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  ExploreCatalogScope,
  ExploreCharacterOption,
  ExploreStyleOption,
  ExploreSubjectAgeFilter,
  ExploreSubjectGenderFilter,
  ExploreSubjectSourceType,
} from './explore-page.types';
import {
  normalizeSourceValue,
  readSubjectMetadata,
  type ApiEnvelope,
  type ExploreCatalogResponse,
  type ExploreImageModelOption,
} from './explore-page-helpers';

export function useExploreCatalogState(initialSubjectSlug?: string) {
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [imageModelOptions, setImageModelOptions] = useState<ExploreImageModelOption[]>([]);
  const [imageModelLoading, setImageModelLoading] = useState(false);
  const [characterOptions, setCharacterOptions] = useState<ExploreCharacterOption[]>([]);
  const [characterLoading, setCharacterLoading] = useState(false);
  const [styleOptions, setStyleOptions] = useState<ExploreStyleOption[]>([]);
  const [styleLoading, setStyleLoading] = useState(false);
  const [subjectScope, setSubjectScope] = useState<ExploreCatalogScope>('all');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<ExploreSubjectSourceType>('all');
  const [subjectGenderFilter, setSubjectGenderFilter] = useState<ExploreSubjectGenderFilter>('all');
  const [subjectAgeFilter, setSubjectAgeFilter] = useState<ExploreSubjectAgeFilter>('all');
  const preselectedSubjectSlug = initialSubjectSlug?.trim() ?? '';

  useEffect(() => {
    let cancelled = false;
    setImageModelLoading(true);

    const fetchImageModels = async () => {
      const candidates = [
        '/api/model-endpoints?modelKind=image&scope=userEnabled',
        '/api/model-endpoints?modelKind=image&scope=all',
      ];

      for (const endpoint of candidates) {
        const response = await fetch(endpoint, {
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        const payload = (await response.json()) as ApiEnvelope<ExploreImageModelOption[]>;
        if (!response.ok || !payload.ok) {
          throw new Error(!payload.ok ? payload.error.message : '加载主体图模型失败。');
        }
        if (payload.data.length > 0 || endpoint === candidates[candidates.length - 1]) {
          return payload.data;
        }
      }

      return [];
    };

    void fetchImageModels()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setImageModelOptions(data);
        setSelectedImageModel((current) => {
          if (current && data.some((model) => model.slug === current)) {
            return current;
          }
          return '';
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setImageModelOptions([]);
        setSelectedImageModel('');
      })
      .finally(() => {
        if (!cancelled) {
          setImageModelLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCharacterLoading(true);

    void fetch('/api/explore/subjects?scope=all', {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApiEnvelope<ExploreCatalogResponse<ExploreCharacterOption>>;
        if (!response.ok || !payload.ok) {
          throw new Error(!payload.ok ? payload.error.message : '加载主体列表失败。');
        }
        return payload.data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setCharacterOptions(data);
        setSelectedCharacter((current) => {
          if (current && data.some((subject) => subject.slug === current)) {
            return current;
          }
          return '';
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCharacterOptions([]);
        setSelectedCharacter('');
      })
      .finally(() => {
        if (!cancelled) {
          setCharacterLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStyleLoading(true);

    void fetch('/api/explore/styles?scope=all', {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApiEnvelope<ExploreCatalogResponse<ExploreStyleOption>>;
        if (!response.ok || !payload.ok) {
          throw new Error(!payload.ok ? payload.error.message : '加载画风列表失败。');
        }
        return payload.data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setStyleOptions(data);
        setSelectedModel((current) => {
          if (current && data.some((style) => style.slug === current)) {
            return current;
          }
          return '';
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setStyleOptions([]);
        setSelectedModel('');
      })
      .finally(() => {
        if (!cancelled) {
          setStyleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedImageModelOption = useMemo(
    () => imageModelOptions.find((model) => model.slug === selectedImageModel) ?? null,
    [imageModelOptions, selectedImageModel],
  );
  const selectedCharacterOption = useMemo(
    () => characterOptions.find((subject) => subject.slug === selectedCharacter) ?? null,
    [characterOptions, selectedCharacter],
  );
  const selectedStyleOption = useMemo(
    () => styleOptions.find((style) => style.slug === selectedModel) ?? null,
    [selectedModel, styleOptions],
  );

  const filteredCharacterOptions = useMemo(
    () =>
      characterOptions.filter((subject) => {
        const metadata = readSubjectMetadata(subject);
        const sourceType = normalizeSourceValue(metadata.sourceType);
        const sourceGender = normalizeSourceValue(metadata.sourceGender);
        const sourceAgeGroup = normalizeSourceValue(metadata.sourceAgeGroup);

        if (subjectScope === 'public' && subject.visibility !== 'public') {
          return false;
        }
        if (subjectScope === 'personal' && subject.visibility !== 'personal') {
          return false;
        }
        if (subjectTypeFilter !== 'all' && sourceType !== subjectTypeFilter) {
          return false;
        }
        if (subjectGenderFilter !== 'all' && sourceGender !== subjectGenderFilter) {
          return false;
        }
        if (subjectAgeFilter !== 'all' && sourceAgeGroup !== subjectAgeFilter) {
          return false;
        }

        return true;
      }),
    [characterOptions, subjectAgeFilter, subjectGenderFilter, subjectScope, subjectTypeFilter],
  );

  return {
    selectedModel,
    setSelectedModel,
    selectedImageModel,
    setSelectedImageModel,
    selectedCharacter,
    setSelectedCharacter,
    imageModelOptions,
    imageModelLoading,
    characterOptions,
    characterLoading,
    styleOptions,
    styleLoading,
    subjectScope,
    setSubjectScope,
    subjectTypeFilter,
    setSubjectTypeFilter,
    subjectGenderFilter,
    setSubjectGenderFilter,
    subjectAgeFilter,
    setSubjectAgeFilter,
    preselectedSubjectSlug,
    selectedImageModelOption,
    selectedCharacterOption,
    selectedStyleOption,
    filteredCharacterOptions,
  };
}
