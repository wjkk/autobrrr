'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cx, Tooltip, TooltipProvider } from '@aiv/ui';

import styles from './explore-page.module.css';

import type { StudioFixture } from '@aiv/domain';
import { createStudioProject } from '@/lib/studio-service';
import {
  CHARACTER_OPTIONS,
  CONTENT_TABS,
  IMAGE_MODEL_OPTIONS,
  PRESET_LIBRARY,
  STYLE_OPTIONS,
  TAB_PLACEHOLDERS,
  TAB_PREFIX_CLASS_SUFFIX,
} from './explore-page.data';
import type { ContentTab, ExplorePopover, ExploreSidebarNav } from './explore-page.types';

interface ExplorePageProps {
  studio: StudioFixture;
}

const PRESET_IMAGE_CLASSES = [styles.presetImg1, styles.presetImg2, styles.presetImg3];

export function ExplorePage({ studio }: ExplorePageProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('短剧漫剧');
  const [promptText, setPromptText] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prototype UI States
  const [activeSidebarNav, setActiveSidebarNav] = useState<ExploreSidebarNav>('home');
  const [isMultiEpisode, setIsMultiEpisode] = useState(false);

  // Popover state for toolbar
  const [activePopover, setActivePopover] = useState<ExplorePopover>(null);

  // Selected parameters
  const [selectedModel, setSelectedModel] = useState(''); // 画风
  const [selectedImageModel, setSelectedImageModel] = useState(''); // 主体图模型
  const [selectedCharacter, setSelectedCharacter] = useState(''); // 主体角色

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerToast(`已准备上传: ${e.target.files[0].name}`);
    }
  };

  const handleSubmit = async () => {
    const normalizedPrompt = promptText.trim();
    if (!normalizedPrompt || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const contentMode = activeTab === '短剧漫剧' && isMultiEpisode ? 'series' : 'single';
      const created = await createStudioProject({
        prompt: normalizedPrompt,
        contentMode,
      });
      router.push(`/projects/${created.projectId}/planner`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败，请重试。';
      triggerToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  const activePresetCards = PRESET_LIBRARY[activeTab];

  return (
    <TooltipProvider>
      <div className={styles.page}>



        {/* Global Sidebar (Seko replica) */}
        <aside className={styles.globalSidebar}>
          {/* Top Icons */}
          <div className={styles.sidebarGroup}>
            <div className={styles.brandMark} onClick={() => router.push('/explore')}>
              <span style={{ fontWeight: 800, fontSize: 18, fontStyle: 'italic', color: 'var(--text-primary)' }}>S</span>
            </div>
            <button className={cx(styles.navBtn, activeSidebarNav === 'home' && styles.navBtnActive)} aria-label="首页" title="首页" onClick={() => setActiveSidebarNav('home')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><line x1="12" y1="12" x2="12" y2="18"></line></svg>
            </button>
            <button className={cx(styles.navBtn, activeSidebarNav === 'projects' && styles.navBtnActive)} aria-label="作品" title="我的资产" onClick={() => setActiveSidebarNav('projects')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            </button>
            <button className={cx(styles.navBtn, activeSidebarNav === 'avatar' && styles.navBtnActive)} aria-label="资产" title="数字分身" onClick={() => setActiveSidebarNav('avatar')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><path d="M19 6l1-1 1 1-1 1-1-1z" /><path d="M16 3l.5-.5.5.5-.5.5-.5-.5z" /></svg>
            </button>
            <button className={cx(styles.navBtn, activeSidebarNav === 'voice' && styles.navBtnActive)} aria-label="社区" title="声音克隆" onClick={() => setActiveSidebarNav('voice')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21v-2a4 4 0 0 1 4-4h4" /><line x1="16" y1="16" x2="16" y2="20" /><line x1="19" y1="15" x2="19" y2="21" /><line x1="22" y1="17" x2="22" y2="19" /></svg>
            </button>
          </div>

          {/* Bottom User Area */}
          <div className={styles.sidebarGroup}>
            <button className={styles.vipBadge} onClick={() => router.push('/vip')}>
              <strong>✦ 99</strong>
              <span>开通会员</span>
            </button>
            <button className={styles.utilBtn} aria-label="Profile" onClick={() => router.push('/profile')}>
              <div className={styles.avatar}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>
            </button>
            <button className={styles.utilBtn} aria-label="Notifications" onClick={() => router.push('/notifications')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
            <button className={styles.utilBtn} aria-label="Feedback" onClick={() => router.push('/feedback')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1.5" fill="currentColor"></circle><circle cx="12" cy="10" r="1.5" fill="currentColor"></circle><circle cx="15" cy="10" r="1.5" fill="currentColor"></circle></svg>
            </button>
          </div>
        </aside>

        {/* Global Top Nav Workspace Bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.brandTitle}>AIV Studio</span>
            <span className={styles.divider}>/</span>
            <span className={styles.pageTitle}>灵感创作台</span>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.publishBtn} onClick={() => router.push('/settings/providers')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v6m0 6v6M3 12h6m6 0h6" /></svg>
              接口配置
            </button>
            <button className={styles.publishBtn} onClick={() => router.push(`/projects/${studio.project.id}/creation`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              发布作品
            </button>
          </div>
        </header>

        {/* The Page Scroll Container for natural layout flow */}
        <div className={styles.pageScrollContainer}>

          {/* The Hero Composer Layer */}
          <div className={cx(styles.composerSection, isExpanded && styles.composerSectionExpanded)}>
            <div
              ref={composerRef}
              className={cx(styles.composerWrapper, isExpanded && styles.composerWrapperExpanded)}
            >

              <h1 className={styles.heroTitle}>有什么新的故事灵感？</h1>

              {/* The Main Input Box */}
              <div
                className={cx(styles.composerBox, isExpanded && styles.composerBoxExpanded)}
                onClick={!isExpanded ? handleExpand : undefined}
              >
                {!isExpanded ? (
                  // Collapsed Pill Content
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
                  // Expanded Inner Input Area
                  <div className={styles.expandedInputArea}>
                    <div className={styles.inputFlexRow}>

                      {/* MV explicit slot */}
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
                          onChange={(e) => setPromptText(e.target.value)}
                          placeholder={TAB_PLACEHOLDERS[activeTab]}
                          className={styles.textarea}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Inner Toolbar */}
                    <div className={styles.innerToolbar}>
                      <div className={styles.toolbarLeft}>
                        {/* Hide attachment clip if MV mode is active, per user feedback */}
                        {activeTab !== '音乐MV' && (
                          <Tooltip content="上传剧本">
                            <button className={styles.toolIcon} onClick={() => fileInputRef.current?.click()}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            </button>
                          </Tooltip>
                        )}

                        <div className={styles.popoverContainer}>
                          {selectedImageModel ? (
                            <div className={cx(styles.selectedTokenPill, activePopover === 'imageModel' && styles.selectedTokenPillActive)} onClick={() => setActivePopover(activePopover === 'imageModel' ? null : 'imageModel')}>
                              <span className={styles.tokenPillText}>{selectedImageModel}</span>
                              <button className={styles.tokenPillClear} onClick={(e) => { e.stopPropagation(); setSelectedImageModel(''); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                          ) : (
                            <Tooltip content="主体图模型">
                              <button
                                className={cx(styles.toolIcon, activePopover === 'imageModel' && styles.toolIconActive)}
                                onClick={() => setActivePopover(activePopover === 'imageModel' ? null : 'imageModel')}
                              >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                              </button>
                            </Tooltip>
                          )}
                        </div>

                        <div className={styles.popoverContainer}>
                          {selectedCharacter ? (
                            <div className={cx(styles.selectedTokenPill, activePopover === 'character' && styles.selectedTokenPillActive)} onClick={() => setActivePopover(activePopover === 'character' ? null : 'character')}>
                              <img src={CHARACTER_OPTIONS.find((c) => c.name === selectedCharacter)?.imageUrl} alt={selectedCharacter} className={styles.tokenPillAvatar} />
                              <span className={styles.tokenPillText}>{selectedCharacter}</span>
                              <button className={styles.tokenPillClear} onClick={(e) => { e.stopPropagation(); setSelectedCharacter(''); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                          ) : (
                            <Tooltip content="主体角色列表">
                              <button
                                className={cx(styles.toolIcon, activePopover === 'character' && styles.toolIconActive)}
                                onClick={() => setActivePopover(activePopover === 'character' ? null : 'character')}
                              >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>
                              </button>
                            </Tooltip>
                          )}
                        </div>

                        <div className={styles.popoverContainer}>
                          {selectedModel ? (
                            <div className={cx(styles.selectedTokenPill, activePopover === 'model' && styles.selectedTokenPillActive)} onClick={() => setActivePopover(activePopover === 'model' ? null : 'model')}>
                              <img src={STYLE_OPTIONS.find((s) => s.name === selectedModel)?.imageUrl} alt={selectedModel} className={styles.tokenPillAvatar} />
                              <span className={styles.tokenPillText}>{selectedModel}</span>
                              <button className={styles.tokenPillClear} onClick={(e) => { e.stopPropagation(); setSelectedModel(''); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                          ) : (
                            <Tooltip content="画风列表">
                              <button
                                className={cx(styles.toolIcon, activePopover === 'model' && styles.toolIconActive)}
                                onClick={() => setActivePopover(activePopover === 'model' ? null : 'model')}
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
                            <div className={cx(styles.switchTrack, isMultiEpisode && styles.switchTrackActive)} onClick={() => setIsMultiEpisode(!isMultiEpisode)}>
                              <div className={cx(styles.switchThumb, isMultiEpisode && styles.switchThumbActive)} />
                            </div>
                          </label>
                        )}

                        <button
                          className={cx(styles.submitButton, promptText.trim().length > 0 && styles.submitButtonActive)}
                          onClick={handleSubmit}
                          disabled={promptText.trim().length === 0 || submitting}
                          aria-label="Send"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        </button>
                      </div>
                    </div>

                    {/* Hidden File Input for attachments/MV music */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                  </div>
                )}
              </div>

              {/* Global Popover overlay correctly positioned below composerBox */}
              {isExpanded && activePopover && (
                <div className={cx(
                  styles.globalPopoverArea,
                  activePopover === 'imageModel' && styles.popoverModelSelection
                )}>
                  {activePopover === 'imageModel' && (
                    <div className={styles.popoverMenu}>
                      <div className={styles.popoverHeader}>主体图模型</div>
                      <div className={styles.popoverModelList}>
                        {IMAGE_MODEL_OPTIONS.map(m => (
                          <button
                            key={m}
                            className={cx(styles.popoverItem, selectedImageModel === m && styles.popoverItemActive)}
                            onClick={() => {
                              setSelectedImageModel(m);
                              setActivePopover(null);
                            }}
                          >
                            {m}
                            {selectedImageModel === m && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePopover === 'character' && (
                    <div className={styles.popoverMenu}>
                      <div className={styles.popoverHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <span style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>公共</span>
                          <span style={{ cursor: 'pointer' }}>个人</span>
                        </div>
                        <span onClick={() => router.push('/projects/new-character')} className={styles.textLink}>+ 添加新主体</span>
                      </div>

                      <div className={styles.popoverFilterBar}>
                        <span className={styles.filterChipActive}>全部</span>
                        <span className={styles.filterChip}>女性</span>
                        <span className={styles.filterChip}>男性</span>
                        <span className={styles.filterChip}>小孩</span>
                      </div>

                      <div className={cx(styles.popoverGridCols4, styles.popoverGridScrollable)}>
                        {CHARACTER_OPTIONS.map((char) => (
                          <button
                            key={char.name}
                            className={cx(styles.characterAvatarBtn, selectedCharacter === char.name && styles.characterAvatarBtnActive)}
                            onClick={() => {
                              setSelectedCharacter(char.name);
                              setActivePopover(null);
                            }}
                          >
                            <img src={char.imageUrl} alt={char.name} className={styles.characterAvatarImg} />
                            <span className={styles.characterName}>{char.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePopover === 'model' && (
                    <div className={styles.popoverMenu}>
                      <div className={styles.popoverHeader}>画风列表</div>
                      <div className={cx(styles.popoverGridCols5, styles.popoverGridScrollable)}>
                        {STYLE_OPTIONS.map((style) => (
                          <button
                            key={style.name}
                            className={cx(styles.styleCardBtn, selectedModel === style.name && styles.styleCardBtnActive)}
                            onClick={() => {
                              setSelectedModel(style.name);
                              setActivePopover(null);
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
                  )}
                </div>
              )}

              {/* Elements BELOW the input box */}
              {isExpanded && (
                <div className={styles.expandedPanels}>

                  {/* Mode Tabs */}
                  <div className={styles.modeTabs}>
                    {CONTENT_TABS.map((tabItem) => (
                      <button
                        key={tabItem.id}
                        className={cx(styles.tabChip, activeTab === tabItem.id && styles.tabChipActive)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(tabItem.id);
                        }}
                      >
                        {/* Icons within tabs */}
                        {tabItem.id === '短剧漫剧' && (
                          <div className={cx(styles.tabIconWrapper, styles.bgPink)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                          </div>
                        )}
                        {tabItem.id === '音乐MV' && (
                          <div className={cx(styles.tabIconWrapper, styles.bgPurple)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                          </div>
                        )}
                        {tabItem.id === '知识分享' && (
                          <div className={cx(styles.tabIconWrapper, styles.bgBlue)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line><line x1="8" y1="8" x2="10" y2="8"></line></svg>
                          </div>
                        )}
                        <span>{tabItem.id}</span>
                        {tabItem.beta ? <span className={styles.betaTag}>Beta</span> : null}
                      </button>
                    ))}
                  </div>

                  {/* Preset Gallery */}
                  <div className={styles.presetGallery}>
                    {activePresetCards.map((preset) => (
                      <button key={preset.title} className={styles.presetCard} onClick={() => setPromptText(preset.seedPrompt)}>
                        <span className={styles.presetTitle}>{preset.title}</span>
                        <div className={styles.presetImages}>
                          {preset.previewUrls.map((imageUrl, index) => (
                            <img key={`${preset.title}-${index}`} src={imageUrl} alt={preset.title} className={PRESET_IMAGE_CLASSES[index]} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Background Layer (Inspiration Square) */}
            <div className={styles.inspirationSquareSection}>
              {/* Section Header */}
              <div className={styles.squareHeader}>
                <h2 className={styles.squareTitle}>灵感广场</h2>
              </div>

              {/* Masonry Grid */}
              <div className={styles.masonryGrid}>

                {/* Card 1 - Anime */}
                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 20' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverTopPlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <div className={styles.hoverBottomActions}>
                        <span className={styles.hoverTitle}>星际奇遇少女</span>
                        <button className={styles.cloneStyleBtn}>做同款</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardStatsBar}>
                    <div className={styles.authorInfo}>
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=32" alt="author" />
                      <span>AI Creator</span>
                    </div>
                    <button className={styles.likeBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      <span>1.2k</span>
                    </button>
                  </div>
                </div>

                {/* Card 2 - Realistic Model Ad */}
                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 32' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    {/* Inner AD content mock */}
                    <div className={styles.adContentMock}>
                      <h3>AutoBrrr</h3>
                      <h2>模型上新 <span className={styles.newBadge}>New</span></h2>
                      <p>一致性模型3.0 / seedream2.0</p>
                    </div>
                    <div className={styles.sliderDots}>
                      <span className={styles.dotActive}></span>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                    </div>
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverBottomActions} style={{ justifyContent: 'center' }}>
                        <button className={styles.cloneStyleBtn} style={{ width: '100%', padding: '12px' }}>立即体验</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3 - Cinematic */}
                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 16' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverTopPlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <div className={styles.hoverBottomActions}>
                        <span className={styles.hoverTitle}>末日废土狂飙</span>
                        <button className={styles.cloneStyleBtn}>做同款</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardStatsBar}>
                    <div className={styles.authorInfo}>
                      <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=32" alt="author" />
                      <span>Director.J</span>
                    </div>
                    <button className={styles.likeBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      <span>8k</span>
                    </button>
                  </div>
                </div>

                {/* Card 4 - Sci-fi */}
                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 22' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverTopPlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <div className={styles.hoverBottomActions}>
                        <span className={styles.hoverTitle}>霓虹裂缝</span>
                        <button className={styles.cloneStyleBtn}>做同款</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardStatsBar}>
                    <div className={styles.authorInfo}>
                      <div className={styles.phantomAvatar} />
                      <span>Cyberpunk2077</span>
                    </div>
                    <button className={styles.likeBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      <span>342</span>
                    </button>
                  </div>
                </div>

                {/* Sub-cards generating masonry stagger effect... */}
                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 18' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverTopPlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <div className={styles.hoverBottomActions}>
                        <span className={styles.hoverTitle}>Q版激萌战记</span>
                        <button className={styles.cloneStyleBtn}>做同款</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardStatsBar}>
                    <div className={styles.authorInfo}>
                      <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=32" alt="author" />
                      <span>Mio</span>
                    </div>
                    <button className={styles.likeBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      <span>9.1k</span>
                    </button>
                  </div>
                </div>

                <div className={styles.masonryCard} style={{ gridRowEnd: 'span 28' }}>
                  <div className={styles.cardImageWrapper}>
                    <img src="https://images.unsplash.com/photo-1533050487297-09b450131914?auto=format&fit=crop&q=80&w=400" alt="mock" className={styles.cardRealImg} />
                    <div className={styles.cardHoverOverlay}>
                      <div className={styles.hoverTopPlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <div className={styles.hoverBottomActions}>
                        <span className={styles.hoverTitle}>赛博神明 - 高级打光</span>
                        <button className={styles.cloneStyleBtn}>做同款</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardStatsBar}>
                    <div className={styles.authorInfo}>
                      <div className={styles.phantomAvatar} />
                      <span>Anonymous</span>
                    </div>
                    <button className={styles.likeBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      <span>45</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Global UI Toast for feedback */}
        {toastMsg && (
          <div className={styles.globalToast}>
            {toastMsg}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
