'use client';

import { cx, Tooltip } from '@aiv/ui';
import type { ChangeEventHandler, RefObject } from 'react';

import {
  TAB_PLACEHOLDERS,
  TAB_PREFIX_CLASS_SUFFIX,
} from './explore-page.data';
import type {
  ContentTab,
  ExplorePopover,
  ExploreSubjectAgeFilter,
  ExploreSubjectGenderFilter,
  ExploreSubjectSourceType,
} from './explore-page.types';
import {
  SUBJECT_AGE_OPTIONS,
  SUBJECT_GENDER_OPTIONS,
  SUBJECT_TYPE_OPTIONS,
} from './explore-page-helpers';
import { ExploreComposerPanels } from './explore-composer-panels';
import { ExploreInspirationSquare } from './explore-inspiration-square';
import styles from './explore-page.module.css';

interface ExploreHeroComposerProps {
  routerPush: (href: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  composerRef: RefObject<HTMLDivElement | null>;
  isExpanded: boolean;
  activeTab: ContentTab;
  promptText: string;
  submitting: boolean;
  isMultiEpisode: boolean;
  activePopover: ExplorePopover;
  selectedModel: string;
  selectedImageModel: string;
  selectedCharacter: string;
  imageModelLoading: boolean;
  characterLoading: boolean;
  styleLoading: boolean;
  imageModelOptions: Array<{ id: string; slug: string; label: string }>;
  styleOptions: Array<{ id: string; slug: string; name: string; imageUrl: string }>;
  subjectScope: 'all' | 'public' | 'personal';
  subjectTypeFilter: ExploreSubjectSourceType;
  subjectGenderFilter: ExploreSubjectGenderFilter;
  subjectAgeFilter: ExploreSubjectAgeFilter;
  selectedImageModelOption: { label: string } | null;
  selectedCharacterOption: { name: string; imageUrl: string } | null;
  selectedStyleOption: { name: string; imageUrl: string } | null;
  filteredCharacterOptions: Array<{ id: string; slug: string; name: string; imageUrl: string }>;
  onExpand: () => void;
  onPromptTextChange: (value: string) => void;
  onPresetTitleChange: (value: string) => void;
  onActiveTabChange: (tab: ContentTab) => void;
  onMultiEpisodeChange: (value: boolean) => void;
  onActivePopoverChange: (popover: ExplorePopover) => void;
  onSelectedModelChange: (value: string) => void;
  onSelectedImageModelChange: (value: string) => void;
  onSelectedCharacterChange: (value: string) => void;
  onSubjectScopeChange: (value: 'all' | 'public' | 'personal') => void;
  onSubjectTypeFilterChange: (value: ExploreSubjectSourceType) => void;
  onSubjectGenderFilterChange: (value: ExploreSubjectGenderFilter) => void;
  onSubjectAgeFilterChange: (value: ExploreSubjectAgeFilter) => void;
  onFileSelect: ChangeEventHandler<HTMLInputElement>;
  onSubmit: () => void;
}

export function ExploreHeroComposer({
  routerPush,
  textareaRef,
  fileInputRef,
  composerRef,
  isExpanded,
  activeTab,
  promptText,
  submitting,
  isMultiEpisode,
  activePopover,
  selectedModel,
  selectedImageModel,
  selectedCharacter,
  imageModelLoading,
  characterLoading,
  styleLoading,
  imageModelOptions,
  styleOptions,
  subjectScope,
  subjectTypeFilter,
  subjectGenderFilter,
  subjectAgeFilter,
  selectedImageModelOption,
  selectedCharacterOption,
  selectedStyleOption,
  filteredCharacterOptions,
  onExpand,
  onPromptTextChange,
  onPresetTitleChange,
  onActiveTabChange,
  onMultiEpisodeChange,
  onActivePopoverChange,
  onSelectedModelChange,
  onSelectedImageModelChange,
  onSelectedCharacterChange,
  onSubjectScopeChange,
  onSubjectTypeFilterChange,
  onSubjectGenderFilterChange,
  onSubjectAgeFilterChange,
  onFileSelect,
  onSubmit,
}: ExploreHeroComposerProps) {
  return (
    <div className={cx(styles.composerSection, isExpanded && styles.composerSectionExpanded)}>
      <div
        ref={composerRef}
        className={cx(styles.composerWrapper, isExpanded && styles.composerWrapperExpanded)}
      >
        <h1 className={styles.heroTitle}>有什么新的故事灵感？</h1>

        <div
          className={cx(styles.composerBox, isExpanded && styles.composerBoxExpanded)}
          onClick={!isExpanded ? onExpand : undefined}
        >
          {!isExpanded ? (
            <div className={styles.collapsedContent}>
              <span className={styles.placeholderText}>
                <span className={cx(styles.prefixTag, styles[`prefixTag_${TAB_PREFIX_CLASS_SUFFIX[activeTab]}`])}>{activeTab} / </span>
                {TAB_PLACEHOLDERS[activeTab]}
              </span>
              <div className={styles.collapsedRightIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </div>
            </div>
          ) : (
            <div className={styles.expandedInputArea}>
              <div className={styles.inputFlexRow}>
                {activeTab === '音乐MV' && (
                  <button className={styles.addMediaSlot} onClick={() => fileInputRef.current?.click()}>
                    <span className={styles.addIcon}>+</span>
                    <span className={styles.addText}>音乐</span>
                  </button>
                )}

                <div className={styles.textInputWrapper}>
                  <span className={cx(styles.prefixTag, styles[`prefixTag_${TAB_PREFIX_CLASS_SUFFIX[activeTab]}`])}>
                    {activeTab} /
                  </span>
                  <textarea
                    ref={textareaRef}
                    value={promptText}
                    onChange={(event) => onPromptTextChange(event.target.value)}
                    placeholder={TAB_PLACEHOLDERS[activeTab]}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.innerToolbar}>
                <div className={styles.toolbarLeft}>
                  {activeTab !== '音乐MV' && (
                    <Tooltip content="上传剧本">
                      <button className={styles.toolIcon} onClick={() => fileInputRef.current?.click()}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      </button>
                    </Tooltip>
                  )}

                  <div className={styles.popoverContainer}>
                    {selectedImageModel ? (
                      <div className={cx(styles.selectedTokenPill, activePopover === 'imageModel' && styles.selectedTokenPillActive)} onClick={() => onActivePopoverChange(activePopover === 'imageModel' ? null : 'imageModel')}>
                        <span className={styles.tokenPillText}>{selectedImageModelOption?.label ?? selectedImageModel}</span>
                        <button className={styles.tokenPillClear} onClick={(event) => { event.stopPropagation(); onSelectedImageModelChange(''); }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ) : (
                      <Tooltip content="主体图模型">
                        <button
                          className={cx(styles.toolIcon, activePopover === 'imageModel' && styles.toolIconActive)}
                          disabled={imageModelLoading || imageModelOptions.length === 0}
                          onClick={() => onActivePopoverChange(activePopover === 'imageModel' ? null : 'imageModel')}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        </button>
                      </Tooltip>
                    )}
                  </div>

                  <div className={styles.popoverContainer}>
                    {selectedCharacter ? (
                      <div className={cx(styles.selectedTokenPill, activePopover === 'character' && styles.selectedTokenPillActive)} onClick={() => onActivePopoverChange(activePopover === 'character' ? null : 'character')}>
                        <img src={selectedCharacterOption?.imageUrl} alt={selectedCharacterOption?.name ?? selectedCharacter} className={styles.tokenPillAvatar} />
                        <span className={styles.tokenPillText}>{selectedCharacterOption?.name ?? selectedCharacter}</span>
                        <button className={styles.tokenPillClear} onClick={(event) => { event.stopPropagation(); onSelectedCharacterChange(''); }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ) : (
                      <Tooltip content="主体角色列表">
                        <button
                          className={cx(styles.toolIcon, activePopover === 'character' && styles.toolIconActive)}
                          onClick={() => onActivePopoverChange(activePopover === 'character' ? null : 'character')}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>
                        </button>
                      </Tooltip>
                    )}
                  </div>

                  <div className={styles.popoverContainer}>
                    {selectedModel ? (
                      <div className={cx(styles.selectedTokenPill, activePopover === 'model' && styles.selectedTokenPillActive)} onClick={() => onActivePopoverChange(activePopover === 'model' ? null : 'model')}>
                        <img src={selectedStyleOption?.imageUrl} alt={selectedStyleOption?.name ?? selectedModel} className={styles.tokenPillAvatar} />
                        <span className={styles.tokenPillText}>{selectedStyleOption?.name ?? selectedModel}</span>
                        <button className={styles.tokenPillClear} onClick={(event) => { event.stopPropagation(); onSelectedModelChange(''); }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ) : (
                      <Tooltip content="画风列表">
                        <button
                          className={cx(styles.toolIcon, activePopover === 'model' && styles.toolIconActive)}
                          onClick={() => onActivePopoverChange(activePopover === 'model' ? null : 'model')}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><circle cx="7.5" cy="9.5" r=".5" fill="currentColor"></circle><circle cx="10.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="15.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="16.5" cy="11.5" r=".5" fill="currentColor"></circle></svg>
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className={styles.toolbarRight}>
                  {activeTab === '短剧漫剧' && (
                    <label className={styles.switchLabel}>
                      <span>多剧集</span>
                      <div className={cx(styles.switchTrack, isMultiEpisode && styles.switchTrackActive)} onClick={() => onMultiEpisodeChange(!isMultiEpisode)}>
                        <div className={cx(styles.switchThumb, isMultiEpisode && styles.switchThumbActive)} />
                      </div>
                    </label>
                  )}

                  <button
                    className={cx(styles.submitButton, promptText.trim().length > 0 && styles.submitButtonActive)}
                    onClick={onSubmit}
                    disabled={promptText.trim().length === 0 || submitting}
                    aria-label="Send"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                onChange={onFileSelect}
              />
            </div>
          )}
        </div>

        {isExpanded && activePopover ? (
          <div className={cx(
            styles.globalPopoverArea,
            activePopover === 'imageModel' && styles.popoverModelSelection,
          )}>
            {activePopover === 'imageModel' ? (
              <div className={styles.popoverMenu}>
                <div className={styles.popoverHeader}>主体图模型</div>
                <div className={styles.popoverModelList}>
                  {imageModelLoading ? <div className={styles.popoverEmpty}>正在加载后台已启用的生图模型...</div> : null}
                  {!imageModelLoading && imageModelOptions.length === 0 ? <div className={styles.popoverEmpty}>请先去接口配置里启用至少一个图片模型。</div> : null}
                  {imageModelOptions.map((model) => (
                    <button
                      key={model.id}
                      className={cx(styles.popoverItem, selectedImageModel === model.slug && styles.popoverItemActive)}
                      onClick={() => {
                        onSelectedImageModelChange(model.slug);
                        onActivePopoverChange(null);
                      }}
                    >
                      <span>{model.label}</span>
                      {selectedImageModel === model.slug ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activePopover === 'character' ? (
              <div className={styles.popoverMenu}>
                <div className={styles.popoverHeaderRow}>
                  <div className={styles.popoverTabs}>
                    <span className={cx(styles.popoverTab, subjectScope === 'all' && styles.popoverTabActive)} onClick={() => onSubjectScopeChange('all')}>全部</span>
                    <span className={cx(styles.popoverTab, subjectScope === 'public' && styles.popoverTabActive)} onClick={() => onSubjectScopeChange('public')}>公共</span>
                    <span className={cx(styles.popoverTab, subjectScope === 'personal' && styles.popoverTabActive)} onClick={() => onSubjectScopeChange('personal')}>个人</span>
                  </div>
                  <span onClick={() => routerPush('/settings/catalogs?tab=subjects')} className={styles.textLink}>+ 添加新主体</span>
                </div>

                <div className={styles.popoverFilterBar}>
                  <select className={styles.popoverSelect} value={subjectTypeFilter} onChange={(event) => onSubjectTypeFilterChange(event.target.value as ExploreSubjectSourceType)}>
                    {SUBJECT_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <select className={styles.popoverSelect} value={subjectGenderFilter} onChange={(event) => onSubjectGenderFilterChange(event.target.value as ExploreSubjectGenderFilter)}>
                    {SUBJECT_GENDER_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <select className={styles.popoverSelect} value={subjectAgeFilter} onChange={(event) => onSubjectAgeFilterChange(event.target.value as ExploreSubjectAgeFilter)}>
                    {SUBJECT_AGE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                <div className={cx(styles.popoverGridCols6, styles.popoverGridScrollable)}>
                  {characterLoading ? <div className={styles.popoverEmpty}>正在加载主体列表...</div> : null}
                  {!characterLoading && filteredCharacterOptions.length === 0 ? <div className={styles.popoverEmpty}>暂无可用主体。</div> : null}
                  {filteredCharacterOptions.map((character) => (
                    <button
                      key={character.id}
                      className={cx(styles.characterAvatarBtn, selectedCharacter === character.slug && styles.characterAvatarBtnActive)}
                      onClick={() => {
                        onSelectedCharacterChange(character.slug);
                        onActivePopoverChange(null);
                      }}
                    >
                      <img src={character.imageUrl} alt={character.name} className={styles.characterAvatarImg} />
                      <span className={styles.characterName}>{character.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activePopover === 'model' ? (
              <div className={styles.popoverMenu}>
                <div className={styles.popoverHeader}>画风列表</div>
                <div className={cx(styles.popoverGridCols5, styles.popoverGridScrollable)}>
                  {styleLoading ? <div className={styles.popoverEmpty}>正在加载画风列表...</div> : null}
                  {!styleLoading && styleOptions.length === 0 ? <div className={styles.popoverEmpty}>暂无可用画风。</div> : null}
                  {styleOptions.map((style) => (
                    <button
                      key={style.id}
                      className={cx(styles.styleCardBtn, selectedModel === style.slug && styles.styleCardBtnActive)}
                      onClick={() => {
                        onSelectedModelChange(style.slug);
                        onActivePopoverChange(null);
                      }}
                    >
                      <div className={styles.styleCardImgWrapper}>
                        <img src={style.imageUrl} alt={style.name} />
                      </div>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {isExpanded ? (
          <ExploreComposerPanels
            activeTab={activeTab}
            onTabChange={onActiveTabChange}
            onPresetSelect={(seedPrompt) => {
              onPromptTextChange(seedPrompt);
              onPresetTitleChange('');
            }}
          />
        ) : null}
      </div>

      <ExploreInspirationSquare onPublish={() => routerPush('/settings/catalogs?tab=subjects')} />
    </div>
  );
}
