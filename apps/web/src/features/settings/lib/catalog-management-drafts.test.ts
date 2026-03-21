import assert from 'node:assert/strict';
import test from 'node:test';

import {
  makeEmptyStyleDraft,
  makeEmptySubjectDraft,
  styleToDraft,
  subjectToDraft,
  toCatalogStylePayload,
  toCatalogSubjectPayload,
} from './catalog-management-drafts';

test('catalog draft helpers expose create-empty and from-entity seams', () => {
  assert.equal(makeEmptySubjectDraft().subjectType, 'human');
  assert.equal(makeEmptyStyleDraft().visibility, 'personal');

  const subjectDraft = subjectToDraft({
    id: 'subject-1',
    slug: 'lead',
    name: 'Lead',
    visibility: 'public',
    subjectType: 'human',
    genderTag: 'female',
    imageUrl: 'https://cdn.example.com/lead.png',
    referenceImageUrl: null,
    description: 'desc',
    promptTemplate: 'prompt',
    negativePrompt: 'neg',
    tags: ['hero'],
    metadata: { mood: 'calm' },
    enabled: true,
    sortOrder: 10,
  });
  const styleDraft = styleToDraft({
    id: 'style-1',
    slug: 'neo-noir',
    name: 'Neo Noir',
    visibility: 'personal',
    imageUrl: 'https://cdn.example.com/style.png',
    description: 'style',
    promptTemplate: 'prompt',
    negativePrompt: 'neg',
    tags: ['dark'],
    metadata: { contrast: 'high' },
    enabled: true,
    sortOrder: 20,
  });

  assert.equal(subjectDraft.tags, 'hero');
  assert.equal(styleDraft.metadata.includes('contrast'), true);
});

test('catalog payload helpers normalize visibility, trimming and optional fields', () => {
  const subjectPayload = toCatalogSubjectPayload({
    ...makeEmptySubjectDraft(),
    slug: ' hero ',
    name: ' Hero ',
    visibility: 'personal',
    description: ' desc ',
    tags: 'a, b',
    metadata: '{"mood":"calm"}',
  }, true);
  const stylePayload = toCatalogStylePayload({
    ...makeEmptyStyleDraft(),
    slug: ' style ',
    name: ' Style ',
    description: ' glossy ',
    tags: 'film, grain',
  }, false);

  assert.equal(subjectPayload.visibility, 'public');
  assert.deepEqual(subjectPayload.tags, ['a', 'b']);
  assert.deepEqual(subjectPayload.metadata, { mood: 'calm' });
  assert.equal(stylePayload.slug, 'style');
  assert.equal(stylePayload.description, 'glossy');
});
