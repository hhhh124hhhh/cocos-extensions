'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectPath } = require('./path-safety');

const KNOWN_INSTRUCTION_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md',
];

function normalizeSkillName(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized) {
    throw new Error('skillName is required.');
  }
  return normalized;
}

function statFile(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

function listSkillFiles(projectPath) {
  const skillRoot = resolveProjectPath(projectPath, '.codex/skills');
  if (!fs.existsSync(skillRoot)) {
    return [];
  }

  const skills = [];
  const stack = [skillRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.name === 'SKILL.md') {
        const stat = statFile(fullPath);
        skills.push({
          path: path.relative(projectPath, fullPath).replace(/\\/g, '/'),
          size: stat ? stat.size : 0,
          mtime: stat ? stat.mtime.toISOString() : '',
        });
      }
    }
  }
  return skills.sort((left, right) => left.path.localeCompare(right.path));
}

function listProjectInstructions(projectPath) {
  const files = [];
  for (const relativePath of KNOWN_INSTRUCTION_PATHS) {
    const fullPath = resolveProjectPath(projectPath, relativePath);
    const stat = statFile(fullPath);
    if (stat && stat.isFile()) {
      files.push({
        path: relativePath,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }

  return {
    files,
    skills: listSkillFiles(projectPath),
  };
}

function readProjectInstruction(projectPath, target) {
  const relativePath = String(target || '').trim();
  if (!relativePath) {
    throw new Error('target is required.');
  }
  const fullPath = resolveProjectPath(projectPath, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error(`Instruction file not found: ${relativePath}`);
  }
  return {
    path: relativePath,
    content: fs.readFileSync(fullPath, 'utf8'),
  };
}

function writeProjectInstruction(projectPath, options = {}) {
  const relativePath = String(options.target || '').trim();
  if (!relativePath) {
    throw new Error('target is required.');
  }
  const content = String(options.content || '');
  const fullPath = resolveProjectPath(projectPath, relativePath);
  if (fs.existsSync(fullPath) && options.overwrite === false) {
    throw new Error(`Instruction file already exists: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  const stat = fs.statSync(fullPath);
  return {
    written: true,
    path: relativePath,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

function createProjectSkill(projectPath, options = {}) {
  const skillName = normalizeSkillName(options.skillName);
  const title = String(options.title || skillName).trim();
  const description = String(options.description || `Project-specific workflow for ${title}.`).trim();
  const body = String(options.instructions || '').trim() || [
    `Use this skill for ${title} work in this Cocos project.`,
    '',
    '- Inspect the active scene and project context before editing.',
    '- Prefer focused MCP tools before broad manual file edits.',
    '- Run relevant validation tools after changes.',
  ].join('\n');
  const relativePath = `.codex/skills/${skillName}/SKILL.md`;
  const content = [
    `# ${title}`,
    '',
    `Description: ${description}`,
    '',
    '## Instructions',
    body,
    '',
  ].join('\n');
  return writeProjectInstruction(projectPath, {
    target: relativePath,
    content,
    overwrite: options.overwrite !== false,
  });
}

function createCocosMcpProjectSkill(projectPath, options = {}) {
  return createProjectSkill(projectPath, {
    skillName: options.skillName || 'cocos-mcp-bridge-workflow',
    title: options.title || 'Cocos MCP Bridge Workflow',
    description: options.description || 'Use this skill when editing, validating, or debugging this Cocos Creator project through Cocos MCP Bridge.',
    overwrite: options.overwrite !== false,
    instructions: String(options.instructions || '').trim() || [
      '- Start by reading `cocos://project/context` or calling `get_editor_state` to confirm the active project, scene, server URL, and tool profile.',
      '- Prefer `execute_javascript` for high-level scene/editor orchestration, but keep safety checks enabled unless the code was reviewed.',
      '- Use focused tools when they are better primitives: `list_assets`, `inspect_asset_dependencies`, `validate_asset_dependencies`, `run_script_diagnostics`, `get_script_diagnostic_context`, and screenshot tools.',
      '- For UI work, inspect the active Canvas/hierarchy first, mutate the smallest necessary node/component set, then verify with `validate_scene` and a screenshot.',
      '- For prefab or asset edits, inspect dependencies/references before mutation and refresh assets afterward.',
      '- When changing tool exposure, save a named tool profile so the same client setup can be restored later.',
    ].join('\n'),
  });
}

module.exports = {
  KNOWN_INSTRUCTION_PATHS,
  createCocosMcpProjectSkill,
  createProjectSkill,
  listProjectInstructions,
  readProjectInstruction,
  writeProjectInstruction,
};
