'use client';

import { useEffect, useRef, useState } from 'react';

import {
  getDefaultModelSlug,
  getEnabledModelSlugs,
  modelKindLabel,
  setEnabledModelSlugs,
  type DraftState,
  type ModelEndpointOption,
  type ModelKind,
} from './provider-config-page-helpers';
import styles from './provider-config-page.module.css';

interface ProviderModelSelectionSectionProps {
  providerCode: string;
  modelKind: ModelKind;
  endpoints: ModelEndpointOption[];
  draft: DraftState;
  onDraftChange: (providerCode: string, next: Partial<DraftState>) => void;
}

export function ProviderModelSelectionSection(props: ProviderModelSelectionSectionProps) {
  const { providerCode, modelKind, endpoints, draft, onDraftChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const enabledSlugs = getEnabledModelSlugs(draft, modelKind);
  const enabledEndpoints = endpoints.filter((endpoint) => enabledSlugs.includes(endpoint.slug));
  const defaultSlug = getDefaultModelSlug(draft, modelKind);
  const selectableEndpoints = endpoints.filter((endpoint) => enabledSlugs.length === 0 || enabledSlugs.includes(endpoint.slug));
  const filteredEndpoints = endpoints.filter((endpoint) => endpoint.label.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const toggleEndpoint = (endpointSlug: string) => {
    const nextSlugs = enabledSlugs.includes(endpointSlug)
      ? enabledSlugs.filter((slug) => slug !== endpointSlug)
      : [...enabledSlugs, endpointSlug];

    onDraftChange(providerCode, {
      enabledModels: setEnabledModelSlugs(draft, modelKind, nextSlugs),
    });
  };

  return (
    <div className={styles.field}>
      <div className={styles.modelSectionCard}>
        <div className={styles.modelSectionHeader}>
          <div>
            <div className={styles.fieldLabel}>
              <span>{modelKindLabel(modelKind)}模型</span>
              <span className={styles.fieldHint}>已启用 {enabledSlugs.length} / {endpoints.length}</span>
            </div>
          </div>
          <button type="button" className={styles.sectionToggleButton} onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? '收起' : '选择模型'}
          </button>
        </div>

        <div ref={pickerRef} className={styles.modelPicker}>
          <button
            type="button"
            className={`${styles.modelPickerTrigger} ${isOpen ? styles.modelPickerTriggerActive : ''}`}
            onClick={() => setIsOpen((current) => !current)}
          >
            <div className={styles.modelPickerValues}>
              {enabledEndpoints.length > 0 ? (
                enabledEndpoints.map((endpoint) => (
                  <span key={endpoint.id} className={styles.modelPickerTag}>
                    {endpoint.label}
                    <span
                      className={styles.modelPickerTagRemove}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleEndpoint(endpoint.slug);
                      }}
                    >
                      ×
                    </span>
                  </span>
                ))
              ) : (
                <span className={styles.modelPickerPlaceholder}>点击选择可启用的{modelKindLabel(modelKind)}模型，可搜索、可复选</span>
              )}
            </div>
            <div className={styles.modelPickerActions}>
              {enabledEndpoints.length > 0 ? (
                <span
                  className={styles.modelPickerClear}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDraftChange(providerCode, {
                      enabledModels: setEnabledModelSlugs(draft, modelKind, []),
                    });
                  }}
                >
                  清空
                </span>
              ) : null}
              <span className={styles.modelPickerCaret}>{isOpen ? '⌃' : '⌄'}</span>
            </div>
          </button>

          {isOpen ? (
            <div className={styles.modelPickerPanel}>
              <div className={styles.modelPickerSearchWrap}>
                <input
                  className={styles.modelPickerSearch}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索模型"
                />
              </div>
              <div className={styles.modelPickerList}>
                {filteredEndpoints.length > 0 ? (
                  filteredEndpoints.map((endpoint) => {
                    const checked = enabledSlugs.includes(endpoint.slug);
                    return (
                      <button
                        key={endpoint.id}
                        type="button"
                        className={`${styles.modelPickerOption} ${checked ? styles.modelPickerOptionChecked : ''}`}
                        onClick={() => toggleEndpoint(endpoint.slug)}
                      >
                        <span className={styles.modelPickerOptionMark}>{checked ? '✓' : ''}</span>
                        <span className={styles.modelPickerOptionLabel}>{endpoint.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.modelPickerEmpty}>没有匹配到模型，请换个关键词。</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.modelDefaultRow}>
          <div className={styles.fieldLabel}>
            <span>默认{modelKindLabel(modelKind)}模型</span>
            <span className={styles.fieldHint}>
              {modelKind === 'text'
                ? 'planner / 文本任务'
                : modelKind === 'image'
                  ? '图片生成'
                  : modelKind === 'video'
                    ? '视频生成'
                    : '音频生成'} 未显式指定模型时使用
            </span>
          </div>
          <select
            className={styles.input}
            value={defaultSlug}
            onChange={(event) =>
              onDraftChange(providerCode, {
                defaults: {
                  ...draft.defaults,
                  textEndpointSlug: modelKind === 'text' ? event.target.value : draft.defaults.textEndpointSlug,
                  imageEndpointSlug: modelKind === 'image' ? event.target.value : draft.defaults.imageEndpointSlug,
                  videoEndpointSlug: modelKind === 'video' ? event.target.value : draft.defaults.videoEndpointSlug,
                  audioEndpointSlug: modelKind === 'audio' ? event.target.value : draft.defaults.audioEndpointSlug,
                },
              })
            }
          >
            <option value="">不设置</option>
            {selectableEndpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.slug}>
                {endpoint.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
