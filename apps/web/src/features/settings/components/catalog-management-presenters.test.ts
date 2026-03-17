import test from 'node:test';
import assert from 'node:assert/strict';

import { genderLabel, subjectTypeLabel, visibilityLabel } from './catalog-management-presenters';

test('catalog management presenters map visibility, subject type and gender to stable labels', () => {
  assert.equal(visibilityLabel('public'), '公共');
  assert.equal(visibilityLabel('personal'), '个人');

  assert.equal(subjectTypeLabel('human'), '人物');
  assert.equal(subjectTypeLabel('animal'), '动物');
  assert.equal(subjectTypeLabel('creature'), '幻想生物');
  assert.equal(subjectTypeLabel('object'), '物体');

  assert.equal(genderLabel('female'), '女性');
  assert.equal(genderLabel('male'), '男性');
  assert.equal(genderLabel('child'), '儿童');
  assert.equal(genderLabel('unknown'), '未知');
});
