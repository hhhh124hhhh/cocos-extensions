'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { isPathInside, resolveProjectPath } = require('../lib/path-safety');

test('resolveProjectPath resolves project-relative paths inside the project root', () => {
  const root = path.resolve('/tmp/funplay-cocos-test-project');
  assert.equal(resolveProjectPath(root, 'assets/player.ts'), path.join(root, 'assets', 'player.ts'));
});

test('resolveProjectPath allows absolute paths only when they stay inside the project root', () => {
  const root = path.resolve('/tmp/funplay-cocos-test-project');
  const inside = path.join(root, 'assets', 'scene.scene');
  assert.equal(resolveProjectPath(root, inside), inside);
});

test('resolveProjectPath rejects path traversal outside the project root', () => {
  const root = path.resolve('/tmp/funplay-cocos-test-project');
  assert.throws(
    () => resolveProjectPath(root, '../secret.txt'),
    /outside the Cocos project/
  );
});

test('resolveProjectPath rejects absolute paths outside the project root', () => {
  const root = path.resolve('/tmp/funplay-cocos-test-project');
  assert.throws(
    () => resolveProjectPath(root, '/tmp/secret.txt'),
    /outside the Cocos project/
  );
});

test('isPathInside treats the project root as inside itself', () => {
  const root = path.resolve('/tmp/funplay-cocos-test-project');
  assert.equal(isPathInside(root, root), true);
});
