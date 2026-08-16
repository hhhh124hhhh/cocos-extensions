'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { findTypescriptCommand, runScriptDiagnostics } = require('../lib/diagnostics');

test('findTypescriptCommand runs the TypeScript script through Node on Windows', (t) => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-diagnostics-'));
  t.after(() => fs.rmSync(projectPath, { recursive: true, force: true }));
  const compiler = path.join(projectPath, 'node_modules', 'typescript', 'bin', 'tsc');
  fs.mkdirSync(path.dirname(compiler), { recursive: true });
  fs.writeFileSync(compiler, '', 'utf8');

  const command = findTypescriptCommand(projectPath, {
    platform: 'win32',
    execPath: 'C:\\Program Files\\nodejs\\node.exe',
  });

  assert.equal(command.binary, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(command.argsPrefix, [compiler]);
  assert.equal(command.compiler, compiler);
  assert.deepEqual(command.env, { ELECTRON_RUN_AS_NODE: '1' });
});

test('findTypescriptCommand does not execute npx.cmd when no Windows compiler exists', (t) => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-diagnostics-'));
  t.after(() => fs.rmSync(projectPath, { recursive: true, force: true }));

  const command = findTypescriptCommand(projectPath, {
    platform: 'win32',
    editorPath: path.join(projectPath, 'missing-editor'),
    resourcesPath: path.join(projectPath, 'missing-resources'),
  });

  assert.equal(command, null);
});

test('runScriptDiagnostics executes a project-local TypeScript script', async (t) => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-diagnostics-'));
  t.after(() => fs.rmSync(projectPath, { recursive: true, force: true }));
  const compiler = path.join(projectPath, 'node_modules', 'typescript', 'bin', 'tsc');
  fs.mkdirSync(path.dirname(compiler), { recursive: true });
  fs.writeFileSync(compiler, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');
  fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), '{}\n', 'utf8');

  const result = await runScriptDiagnostics(projectPath);

  assert.equal(result.ok, true);
  assert.equal(result.binary, process.execPath);
  assert.equal(result.compiler, compiler);
});
