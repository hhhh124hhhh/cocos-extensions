'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyToolProfile,
  createToolProfileSnapshot,
  deleteToolProfile,
  exportToolProfiles,
  importToolProfiles,
  normalizeSavedToolProfiles,
  upsertToolProfile,
} = require('../lib/tool-profiles');

test('tool profiles normalize, upsert, and dedupe by name', () => {
  const profiles = normalizeSavedToolProfiles([
    { name: 'QA', toolProfile: 'custom', enabledToolCategories: 'assets\nlogs' },
    { name: 'qa', toolProfile: 'full', disabledTools: ['delete_asset'] },
    { name: '' },
  ]);

  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].name, 'qa');
  assert.equal(profiles[0].toolProfile, 'full');

  const updated = upsertToolProfile(profiles, {
    name: 'Prototype',
    toolProfile: 'custom',
    enabledToolCategories: ['ui'],
  });

  assert.equal(updated.length, 2);
  assert.equal(updated.some((profile) => profile.name === 'Prototype'), true);
});

test('tool profiles snapshot and apply exposure config', () => {
  const snapshot = createToolProfileSnapshot({
    toolProfile: 'custom',
    enabledToolCategories: ['assets'],
    disabledToolCategories: ['input'],
    enabledTools: ['write_file'],
    disabledTools: ['delete_asset'],
  }, 'Asset QA');

  const applied = applyToolProfile({ port: 8765 }, snapshot);
  assert.equal(applied.port, 8765);
  assert.equal(applied.activeToolProfileName, 'Asset QA');
  assert.deepEqual(applied.enabledToolCategories, ['assets']);
  assert.deepEqual(applied.disabledTools, ['delete_asset']);
});

test('tool profiles import, export, and delete', () => {
  const imported = importToolProfiles([], JSON.stringify({
    version: 1,
    profiles: [
      { name: 'Core QA', toolProfile: 'core' },
      { name: 'Debug', toolProfile: 'custom', enabledToolCategories: ['logs', 'diagnostics'] },
    ],
  }));

  assert.equal(imported.length, 2);
  assert.deepEqual(exportToolProfiles(imported).profiles.map((profile) => profile.name), ['Core QA', 'Debug']);

  const remaining = deleteToolProfile(imported, 'Debug');
  assert.deepEqual(remaining.map((profile) => profile.name), ['Core QA']);
});
