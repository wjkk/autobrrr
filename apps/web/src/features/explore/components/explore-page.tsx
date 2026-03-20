'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TooltipProvider } from '@aiv/ui';

import styles from './explore-page.module.css';
import { SystemShell } from '../../shared/components/system-shell';
import { buildUserShellNavItems } from '../../shared/lib/user-shell-nav';

import { createStudioProject } from '@/lib/studio-service';
import type { ContentTab, ExplorePopover } from './explore-page.types';
import {
  countHanCharacters,
  MAX_SCRIPT_HAN_CHAR_COUNT,
} from './explore-page-helpers';
import { ExploreHeroComposer } from './explore-hero-composer';
import { useExploreCatalogState } from './use-explore-catalog-state';

export function ExplorePage(props: { initialSubjectSlug?: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('短剧漫剧');
  const [promptText, setPromptText] = useState('');
  const [selectedPresetTitle, setSelectedPresetTitle] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scriptSourceName, setScriptSourceName] = useState('');

  // Prototype UI States
  const [isMultiEpisode, setIsMultiEpisode] = useState(false);

  // Popover state for toolbar
  const [activePopover, setActivePopover] = useState<ExplorePopover>(null);

  const {
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
  } = useExploreCatalogState(props.initialSubjectSlug);

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    setSelectedPresetTitle('');
  }, [activeTab]);

  useEffect(() => {
    if (!preselectedSubjectSlug || !characterOptions.length) {
      return;
    }

    const matched = characterOptions.find((subject) => subject.slug === preselectedSubjectSlug);
    if (!matched) {
      return;
    }

    setSelectedCharacter(matched.slug);
    setIsExpanded(true);
    triggerToast(`已为你预选主体：${matched.name}`);
  }, [characterOptions, preselectedSubjectSlug]);


  const triggerToast = (msg: string) => {
    setToastMsg(msg);
  };

  // Handle focus to expand
  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the composer wrapper OR clicking on a toast
      if (
        isExpanded &&
        composerRef.current &&
        !composerRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(`.${styles.globalToast}`)
      ) {
        setIsExpanded(false);
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isTextLike =
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.markdown');

    if (!isTextLike) {
      triggerToast('上传附件当前仅支持 txt / md / markdown 文件。');
      return;
    }

    try {
      const content = await file.text();
      const normalized = content.trim();
      if (!normalized) {
        triggerToast('剧本文件内容为空。');
        return;
      }

      if (countHanCharacters(normalized) > MAX_SCRIPT_HAN_CHAR_COUNT) {
        triggerToast(`上传附件的汉字数量不能超过 ${MAX_SCRIPT_HAN_CHAR_COUNT}。`);
        return;
      }

      setPromptText(normalized);
      setScriptSourceName(file.name);
      setIsExpanded(true);
      triggerToast(`已导入剧本: ${file.name}`);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch {
      triggerToast('读取剧本文件失败。');
    }
  };

  const handleSubmit = async () => {
    const normalizedPrompt = promptText.trim();
    if (!normalizedPrompt || submitting) {
      return;
    }

    if (countHanCharacters(normalizedPrompt) > MAX_SCRIPT_HAN_CHAR_COUNT) {
      triggerToast(`内容中的汉字数量不能超过 ${MAX_SCRIPT_HAN_CHAR_COUNT}。`);
      return;
    }

    setSubmitting(true);
    try {
      const contentMode = activeTab === '短剧漫剧' && isMultiEpisode ? 'series' : 'single';
      const created = await createStudioProject({
        prompt: normalizedPrompt,
        contentMode,
        creationConfig: {
          selectedTab: activeTab,
          selectedSubtype: selectedPresetTitle || undefined,
          scriptSourceName: scriptSourceName || undefined,
          scriptContent: scriptSourceName ? normalizedPrompt : undefined,
          imageModelEndpointSlug: selectedImageModel || undefined,
          subjectProfileSlug: selectedCharacter || undefined,
          stylePresetSlug: selectedModel || undefined,
          settings: {
            multiEpisode: isMultiEpisode,
          },
        },
      });
      router.push(`/projects/${created.projectId}/planner`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败，请重试。';
      triggerToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <SystemShell
        pageTitle="灵感创作台"
        navItems={buildUserShellNavItems('home')}
        topActions={[
          { key: 'providers', label: '接口配置', href: '/settings/providers', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v6m0 6v6M3 12h6m6 0h6" /></svg> },
          { key: 'catalogs', label: '管理目录', href: '/settings/catalogs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> },
        ]}
        badge={{ strong: '✦ 99', label: '开通会员', href: '/vip' }}
      >
        <ExploreHeroComposer
          routerPush={router.push}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          composerRef={composerRef}
          isExpanded={isExpanded}
          activeTab={activeTab}
          promptText={promptText}
          submitting={submitting}
          isMultiEpisode={isMultiEpisode}
          activePopover={activePopover}
          selectedModel={selectedModel}
          selectedImageModel={selectedImageModel}
          selectedCharacter={selectedCharacter}
          imageModelLoading={imageModelLoading}
          characterLoading={characterLoading}
          styleLoading={styleLoading}
          imageModelOptions={imageModelOptions}
          styleOptions={styleOptions}
          subjectScope={subjectScope}
          subjectTypeFilter={subjectTypeFilter}
          subjectGenderFilter={subjectGenderFilter}
          subjectAgeFilter={subjectAgeFilter}
          selectedImageModelOption={selectedImageModelOption}
          selectedCharacterOption={selectedCharacterOption}
          selectedStyleOption={selectedStyleOption}
          filteredCharacterOptions={filteredCharacterOptions}
          onExpand={handleExpand}
          onPromptTextChange={setPromptText}
          onPresetTitleChange={setSelectedPresetTitle}
          onActiveTabChange={setActiveTab}
          onMultiEpisodeChange={setIsMultiEpisode}
          onActivePopoverChange={setActivePopover}
          onSelectedModelChange={setSelectedModel}
          onSelectedImageModelChange={setSelectedImageModel}
          onSelectedCharacterChange={setSelectedCharacter}
          onSubjectScopeChange={setSubjectScope}
          onSubjectTypeFilterChange={setSubjectTypeFilter}
          onSubjectGenderFilterChange={setSubjectGenderFilter}
          onSubjectAgeFilterChange={setSubjectAgeFilter}
          onFileSelect={handleFileSelect}
          onSubmit={handleSubmit}
        />
        {/* Simple Global UI Toast for feedback */}
        {toastMsg && (
          <div className={styles.globalToast}>
            {toastMsg}
          </div>
        )}
      </SystemShell>
    </TooltipProvider>
  );
}
