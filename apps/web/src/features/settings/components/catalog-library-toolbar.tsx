'use client';

import type { CatalogTab, SubjectType } from '../lib/catalog-management-api';
import {
  CollectionToolbar,
  CollectionToolbarAction,
  CollectionToolbarChips,
  CollectionToolbarGroup,
  CollectionToolbarMeta,
  CollectionToolbarPill,
  CollectionToolbarSearch,
  CollectionToolbarSelect,
} from '../../shared/components/collection-toolbar';

export function CatalogLibraryToolbar(props: {
  activeTab: CatalogTab;
  visibilityFilter: 'public' | 'personal';
  publicOnly: boolean;
  subjectTypeFilter: 'all' | SubjectType;
  searchTerm: string;
  visibleItemsCount: number;
  onTabChange: (tab: CatalogTab) => void;
  onVisibilityFilterChange: (value: 'public' | 'personal') => void;
  onSubjectTypeFilterChange: (value: 'all' | SubjectType) => void;
  onSearchTermChange: (value: string) => void;
  onCreate: () => void;
}) {
  const renderingSubjects = props.activeTab === 'subjects';

  return (
    <CollectionToolbar>
      <CollectionToolbarGroup nowrap>
        <CollectionToolbarChips>
          <CollectionToolbarPill
            active={renderingSubjects}
            activeTone="dark"
            inactiveStyle="plain"
            onClick={() => props.onTabChange('subjects')}
          >
            主体库
          </CollectionToolbarPill>
          <CollectionToolbarPill
            active={!renderingSubjects}
            activeTone="dark"
            inactiveStyle="plain"
            onClick={() => props.onTabChange('styles')}
          >
            画风库
          </CollectionToolbarPill>
        </CollectionToolbarChips>

        <CollectionToolbarChips>
          <CollectionToolbarPill
            active={props.visibilityFilter === 'public'}
            activeTone="warm"
            inactiveStyle="outlined"
            onClick={() => props.onVisibilityFilterChange('public')}
          >
            公共{renderingSubjects ? '主体' : '画风'}
          </CollectionToolbarPill>
          {!props.publicOnly ? (
            <CollectionToolbarPill
              active={props.visibilityFilter === 'personal'}
              activeTone="warm"
              inactiveStyle="outlined"
              onClick={() => props.onVisibilityFilterChange('personal')}
            >
              个人添加
            </CollectionToolbarPill>
          ) : null}
        </CollectionToolbarChips>

        {renderingSubjects ? (
          <CollectionToolbarSelect width={148} value={props.subjectTypeFilter} onChange={(event) => props.onSubjectTypeFilterChange(event.target.value as 'all' | SubjectType)}>
            <option value="all">类别</option>
            <option value="human">人物</option>
            <option value="animal">动物</option>
            <option value="creature">幻想生物</option>
            <option value="object">物体</option>
          </CollectionToolbarSelect>
        ) : null}
      </CollectionToolbarGroup>

      <CollectionToolbarGroup align="end" nowrap>
        <CollectionToolbarSearch
          width={208}
          value={props.searchTerm}
          onChange={(event) => props.onSearchTermChange(event.target.value)}
          placeholder={`输入${renderingSubjects ? '主体' : '画风'}名称进行搜索`}
        />
        <CollectionToolbarAction onClick={props.onCreate}>{renderingSubjects ? '新建主体' : '新建画风'}</CollectionToolbarAction>
        <CollectionToolbarMeta>{`已展示 ${props.visibleItemsCount} 个${renderingSubjects ? '主体' : '画风'}`}</CollectionToolbarMeta>
      </CollectionToolbarGroup>
    </CollectionToolbar>
  );
}
