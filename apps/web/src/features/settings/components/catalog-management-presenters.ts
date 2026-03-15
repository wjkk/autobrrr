import type { CatalogVisibility, SubjectGenderTag, SubjectType } from '../lib/catalog-management-api';

export function visibilityLabel(value: CatalogVisibility) {
  return value === 'public' ? '公共' : '个人';
}

export function subjectTypeLabel(value: SubjectType) {
  switch (value) {
    case 'animal':
      return '动物';
    case 'creature':
      return '幻想生物';
    case 'object':
      return '物体';
    default:
      return '人物';
  }
}

export function genderLabel(value: SubjectGenderTag) {
  switch (value) {
    case 'female':
      return '女性';
    case 'male':
      return '男性';
    case 'child':
      return '儿童';
    default:
      return '未知';
  }
}
