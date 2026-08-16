'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { normalizeSceneTarget, saveSceneContent } = require('../lib/scenes');

function sceneContent(name) {
  return JSON.stringify([
    { __type__: 'cc.SceneAsset', _name: name, scene: { __id__: 1 } },
    { __type__: 'cc.Scene', _name: name, _children: [] },
  ]);
}

test('normalizeSceneTarget constrains scenes to the assets directory', () => {
  const projectPath = path.resolve('/tmp/funplay-cocos-scene-project');
  const target = normalizeSceneTarget(projectPath, 'db://assets/Scenes/Level01');

  assert.equal(target.projectRelative, 'assets/Scenes/Level01.scene');
  assert.equal(target.dbUrl, 'db://assets/Scenes/Level01.scene');
  assert.equal(target.sceneName, 'Level01');
  assert.throws(() => normalizeSceneTarget(projectPath, '../outside'), /inside the Cocos assets directory/);
});

test('saveSceneContent writes and validates serialized scene content', async (t) => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-scene-'));
  t.after(() => fs.rmSync(projectPath, { recursive: true, force: true }));
  fs.mkdirSync(path.join(projectPath, 'assets'), { recursive: true });

  const result = await saveSceneContent(projectPath, {
    target: 'Scenes/Level01',
    content: sceneContent('Level01'),
  });

  assert.equal(result.created, true);
  assert.equal(result.method, 'fs-write');
  assert.equal(fs.existsSync(path.join(projectPath, 'assets', 'Scenes', 'Level01.scene')), true);

  await assert.rejects(
    () => saveSceneContent(projectPath, { target: 'Scenes/Level01', content: sceneContent('Level01') }),
    /already exists/
  );
  await assert.rejects(
    () => saveSceneContent(projectPath, { target: 'Scenes/Invalid', content: '{}' }),
    /serialized cc.SceneAsset/
  );
});
