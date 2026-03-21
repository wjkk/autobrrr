import { useMemo, useState } from 'react';

import type { CatalogStyleItem, CatalogSubjectItem, CatalogTab, CatalogVisibility, SubjectType } from '../../lib/catalog-management-api';
import { filterCatalogStyles, filterCatalogSubjects } from '../../lib/catalog-management-filters';

interface UseCatalogFilterStateOptions {
  initialTab: CatalogTab;
  subjects: CatalogSubjectItem[];
  styles: CatalogStyleItem[];
}

export function useCatalogFilterState({ initialTab, subjects, styles }: UseCatalogFilterStateOptions) {
  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTab);
  const [visibilityFilter, setVisibilityFilter] = useState<CatalogVisibility>('public');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<'all' | SubjectType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const renderingSubjects = activeTab === 'subjects';
  const filteredSubjects = useMemo(
    () => filterCatalogSubjects({ subjects, visibilityFilter, subjectTypeFilter, searchTerm }),
    [searchTerm, subjectTypeFilter, subjects, visibilityFilter],
  );
  const filteredStyles = useMemo(
    () => filterCatalogStyles({ styles, visibilityFilter, searchTerm }),
    [searchTerm, styles, visibilityFilter],
  );
  const visibleItemsCount = renderingSubjects ? filteredSubjects.length : filteredStyles.length;

  return {
    activeTab,
    setActiveTab,
    visibilityFilter,
    setVisibilityFilter,
    subjectTypeFilter,
    setSubjectTypeFilter,
    searchTerm,
    setSearchTerm,
    renderingSubjects,
    filteredSubjects,
    filteredStyles,
    visibleItemsCount,
  };
}
