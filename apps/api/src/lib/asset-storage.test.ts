import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from './asset-storage.js';

test('asset storage helpers infer file extensions and mime types for supported media', () => {
  assert.equal(__testables.getExtensionForMimeType('image/jpeg', 'IMAGE'), 'jpg');
  assert.equal(__testables.getExtensionForMimeType('image/webp; charset=utf-8', 'IMAGE'), 'webp');
  assert.equal(__testables.getExtensionForMimeType('video/quicktime', 'VIDEO'), 'mov');
  assert.equal(__testables.getExtensionForMimeType(null, 'IMAGE'), 'png');
  assert.equal(__testables.getExtensionForMimeType(null, 'VIDEO'), 'mp4');

  assert.equal(__testables.inferMimeTypeFromExtension('/tmp/image.jpg'), 'image/jpeg');
  assert.equal(__testables.inferMimeTypeFromExtension('/tmp/video.mov'), 'video/quicktime');
  assert.equal(__testables.inferMimeTypeFromExtension('/tmp/video.webm'), 'video/webm');
  assert.equal(__testables.inferMimeTypeFromExtension('/tmp/file.unknown'), 'application/octet-stream');
});

test('asset storage helpers build stable public url base and dated relative storage key', () => {
  const publicBaseUrl = __testables.buildPublicBaseUrl();
  assert.match(publicBaseUrl, /^https?:\/\//);

  const storageKey = __testables.buildRelativeStorageKey({
    runId: 'run-1',
    mediaKind: 'IMAGE',
    mimeType: 'image/png',
  });
  assert.match(storageKey, /^\d{4}\/\d{2}\/\d{2}\/run-1\.png$/);
});
