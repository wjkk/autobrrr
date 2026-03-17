import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { generateShotPrompts } from './shot-prompt-generator.js';

interface GoldenFixture {
  modelFamilySlug: string;
  capability: Parameters<typeof generateShotPrompts>[0]['capability'];
  shots: Parameters<typeof generateShotPrompts>[0]['shots'];
  expected: Array<{
    groupId: string;
    shotIds: string[];
    mode: 'multi-shot' | 'single-shot';
    promptText: string;
  }>;
}

const fixturesDir = path.resolve(
  '/Users/jiankunwu/project/aiv/apps/api/src/lib/__fixtures__/shot-prompt-golden',
);

for (const fileName of fs.readdirSync(fixturesDir).filter((name) => name.endsWith('.json')).sort()) {
  test(`golden prompt fixture: ${fileName}`, () => {
    const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), 'utf8')) as GoldenFixture;
    const generated = generateShotPrompts({
      modelFamilySlug: fixture.modelFamilySlug,
      capability: fixture.capability,
      shots: fixture.shots,
    }).map((item) => ({
      groupId: item.groupId,
      shotIds: item.shotIds,
      mode: item.mode,
      promptText: item.promptText,
    }));

    assert.deepEqual(generated, fixture.expected);
  });
}
