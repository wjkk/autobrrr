import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPreviewAssetMap,
  collectPreviewAssetIds,
  resolveProjectPreviewAsset,
} from './studio-project-presenters.js';

test('collectPreviewAssetIds collects linked refinement asset ids', () => {
  const result = collectPreviewAssetIds([
    {
      plannerSessions: [
        {
          refinementVersions: [
            {
              subjects: [{ generatedAssetIdsJson: ['a'], referenceAssetIdsJson: ['b'] }],
              scenes: [{ generatedAssetIdsJson: ['c'], referenceAssetIdsJson: ['d'] }],
              shotScripts: [{ generatedAssetIdsJson: ['e'], referenceAssetIdsJson: ['f'] }],
            },
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(Array.from(result).sort(), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('resolveProjectPreviewAsset prefers refinement-linked asset with source url', () => {
  const previewAssets = [
    {
      id: 'asset-1',
      ownerUserId: 'user-1',
      projectId: 'project-1',
      episodeId: null,
      mediaKind: 'IMAGE' as const,
      sourceKind: 'UPLOAD' as const,
      fileName: 'a.png',
      mimeType: 'image/png',
      fileSizeBytes: 1,
      width: 1,
      height: 1,
      durationMs: null,
      storageKey: 'a',
      sourceUrl: 'https://example.com/a.png',
      metadataJson: null,
      createdAt: new Date('2026-03-21T08:00:00.000Z'),
      updatedAt: new Date('2026-03-21T08:00:00.000Z'),
    },
  ];
  const assetMap = buildPreviewAssetMap(previewAssets);
  const result = resolveProjectPreviewAsset({
    activeRefinement: {
      subjects: [{ generatedAssetIdsJson: ['asset-1'], referenceAssetIdsJson: [] }],
      scenes: [],
      shotScripts: [],
    },
    assetMap,
    projectAssets: previewAssets,
  });

  assert.equal(result?.id, 'asset-1');
  assert.equal(result?.sourceUrl, 'https://example.com/a.png');
});
