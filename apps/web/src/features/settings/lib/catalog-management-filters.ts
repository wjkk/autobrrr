import type {
  CatalogStyleItem,
  CatalogSubjectItem,
  CatalogVisibility,
  SubjectType,
} from './catalog-management-api';

function matchesSearch(item: { name: string; slug: string; description?: string | null; tags?: unknown }, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return [
    item.name,
    item.slug,
    item.description ?? '',
    ...(Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch);
}

export function filterCatalogSubjects(args: {
  subjects: CatalogSubjectItem[];
  visibilityFilter: CatalogVisibility;
  subjectTypeFilter: 'all' | SubjectType;
  searchTerm: string;
}) {
  const { subjects, visibilityFilter, subjectTypeFilter, searchTerm } = args;
  return subjects.filter((item) => {
    if (item.visibility !== visibilityFilter) {
      return false;
    }
    if (subjectTypeFilter !== 'all' && item.subjectType !== subjectTypeFilter) {
      return false;
    }
    return matchesSearch(item, searchTerm);
  });
}

export function filterCatalogStyles(args: {
  styles: CatalogStyleItem[];
  visibilityFilter: CatalogVisibility;
  searchTerm: string;
}) {
  const { styles, visibilityFilter, searchTerm } = args;
  return styles.filter((item) => item.visibility === visibilityFilter && matchesSearch(item, searchTerm));
}
