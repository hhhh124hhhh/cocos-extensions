'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { collectUuidReferences } = require('../lib/tools/assets-advanced');

test('collectUuidReferences finds structured and literal UUID references', () => {
  const refs = collectUuidReferences(JSON.stringify({
    __type__: 'cc.Prefab',
    sprite: { __uuid__: '2d3KcYpS5HCKb6wU0v5c9x' },
    nested: [{ assetUuid: '550e8400-e29b-41d4-a716-446655440000' }],
  }));

  assert.equal(refs.some((ref) => ref.uuid === '2d3KcYpS5HCKb6wU0v5c9x' && ref.source === 'structured'), true);
  assert.equal(refs.some((ref) => ref.uuid === '550e8400-e29b-41d4-a716-446655440000'), true);
});
