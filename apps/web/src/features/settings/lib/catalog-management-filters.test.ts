import assert from 'node:assert/strict';
import test from 'node:test';

import { filterCatalogStyles, filterCatalogSubjects } from './catalog-management-filters';

test('catalog subject/style filters respect visibility, type and search text', () => {
  const subjects = filterCatalogSubjects({
    subjects: [
      { id: '1', slug: 'lead', name: '主角', visibility: 'public', subjectType: 'human', description: '记者', tags: ['hero'], genderTag: 'female', imageUrl: '', referenceImageUrl: null, promptTemplate: null, negativePrompt: null, metadata: null, enabled: true, sortOrder: 1 },
      { id: '2', slug: 'pet', name: '宠物', visibility: 'personal', subjectType: 'animal', description: '猫', tags: ['pet'], genderTag: 'unknown', imageUrl: '', referenceImageUrl: null, promptTemplate: null, negativePrompt: null, metadata: null, enabled: true, sortOrder: 2 },
    ],
    visibilityFilter: 'public',
    subjectTypeFilter: 'human',
    searchTerm: '记者',
  });
  const styles = filterCatalogStyles({
    styles: [
      { id: 's1', slug: 'neo-noir', name: '黑色电影', visibility: 'public', imageUrl: '', description: '高反差', tags: ['film'], promptTemplate: null, negativePrompt: null, metadata: null, enabled: true, sortOrder: 1 },
      { id: 's2', slug: 'pastel', name: '糖果色', visibility: 'personal', imageUrl: '', description: '柔和', tags: ['soft'], promptTemplate: null, negativePrompt: null, metadata: null, enabled: true, sortOrder: 2 },
    ],
    visibilityFilter: 'public',
    searchTerm: '高反差',
  });

  assert.equal(subjects.length, 1);
  assert.equal(subjects[0]?.id, '1');
  assert.equal(styles.length, 1);
  assert.equal(styles[0]?.id, 's1');
});
