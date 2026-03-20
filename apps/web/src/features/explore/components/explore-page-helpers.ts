import type {
  ExploreCharacterOption,
  ExploreSubjectAgeFilter,
  ExploreSubjectGenderFilter,
  ExploreSubjectMetadata,
  ExploreSubjectSourceType,
} from './explore-page.types';

export const MAX_SCRIPT_HAN_CHAR_COUNT = 10_000;

export const SUBJECT_TYPE_OPTIONS: Array<{ value: ExploreSubjectSourceType; label: string }> = [
  { value: 'all', label: '类别' },
  { value: 'character', label: '角色' },
  { value: 'scene', label: '场景' },
];

export const SUBJECT_GENDER_OPTIONS: Array<{ value: ExploreSubjectGenderFilter; label: string }> = [
  { value: 'all', label: '性别' },
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'none', label: '无' },
];

export const SUBJECT_AGE_OPTIONS: Array<{ value: ExploreSubjectAgeFilter; label: string }> = [
  { value: 'all', label: '年龄' },
  { value: 'child', label: '儿童' },
  { value: 'teenager', label: '少年' },
  { value: 'young_adult', label: '青年' },
  { value: 'middle_aged', label: '中年' },
  { value: 'elderly', label: '老年' },
  { value: 'none', label: '无' },
];

export interface ApiEnvelopeSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiEnvelopeFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeFailure;

export interface ExploreImageModelOption {
  id: string;
  slug: string;
  label: string;
  isUserDefault?: boolean;
  provider: {
    code: string;
    name: string;
  };
}

export type ExploreCatalogResponse<T> = T[];

export function countHanCharacters(value: string) {
  return (value.match(/\p{Script=Han}/gu) ?? []).length;
}

export function normalizeSourceValue(value: string | undefined | null) {
  return value ? value.toLowerCase() : 'none';
}

export function readSubjectMetadata(subject: ExploreCharacterOption) {
  return (subject.metadata ?? {}) as ExploreSubjectMetadata;
}
