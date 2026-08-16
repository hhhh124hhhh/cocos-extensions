'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  createCocosMcpProjectSkill,
  createProjectSkill,
  listProjectInstructions,
  readProjectInstruction,
  writeProjectInstruction,
} = require('../lib/project-instructions');

test('project instruction helpers list, read, and write safe project files', () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-instructions-'));
  const write = writeProjectInstruction(projectPath, {
    target: 'AGENTS.md',
    content: '# Agent Notes\n',
  });

  assert.equal(write.written, true);
  assert.equal(readProjectInstruction(projectPath, 'AGENTS.md').content, '# Agent Notes\n');

  const listed = listProjectInstructions(projectPath);
  assert.equal(listed.files.some((file) => file.path === 'AGENTS.md'), true);
});

test('createProjectSkill writes a Codex project skill', () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-skill-'));
  const result = createProjectSkill(projectPath, {
    skillName: 'scene qa',
    title: 'Scene QA',
    description: 'Validate Cocos scenes.',
  });

  assert.equal(result.path, '.codex/skills/scene-qa/SKILL.md');
  const listed = listProjectInstructions(projectPath);
  assert.equal(listed.skills.some((skill) => skill.path === result.path), true);
});

test('createCocosMcpProjectSkill writes the recommended MCP workflow skill', () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-default-skill-'));
  const result = createCocosMcpProjectSkill(projectPath);

  assert.equal(result.path, '.codex/skills/cocos-mcp-bridge-workflow/SKILL.md');
  const content = readProjectInstruction(projectPath, result.path).content;
  assert.match(content, /Cocos MCP Bridge Workflow/);
  assert.match(content, /inspect_asset_dependencies/);
});

test('project instruction helpers reject traversal outside the project', () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-instructions-safe-'));
  assert.throws(
    () => writeProjectInstruction(projectPath, { target: '../AGENTS.md', content: 'x' }),
    /outside the Cocos project/
  );
});
