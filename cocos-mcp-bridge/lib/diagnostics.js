'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function findTypescriptCommand(projectPath, runtime = {}) {
  const platform = runtime.platform || process.platform;
  const nodeBinary = runtime.execPath || process.execPath;
  const possibleRoots = [
    runtime.editorPath || (global.Editor && Editor.App && Editor.App.path),
    runtime.resourcesPath || process.resourcesPath,
    global.Editor && Editor.App && Editor.App.path ? path.dirname(Editor.App.path) : '',
    global.Editor && Editor.App && Editor.App.path ? path.resolve(Editor.App.path, '..') : '',
  ].filter(Boolean);

  const editorBundledScripts = [];
  for (const root of possibleRoots) {
    editorBundledScripts.push(
      path.join(root, 'resources', '3d', 'engine', 'node_modules', 'typescript', 'bin', 'tsc'),
      path.join(root, 'resources', '3d', 'engine', 'node_modules', '@cocos', 'typescript', 'bin', 'tsc'),
      path.join(root, 'app.asar.unpacked', 'node_modules', 'typescript', 'bin', 'tsc'),
      path.join(root, 'Contents', 'Resources', 'resources', '3d', 'engine', 'node_modules', 'typescript', 'bin', 'tsc'),
      path.join(root, 'Contents', 'Resources', 'resources', '3d', 'engine', 'node_modules', '@cocos', 'typescript', 'bin', 'tsc')
    );
  }

  const scriptCandidates = [
    path.join(projectPath, 'node_modules', 'typescript', 'bin', 'tsc'),
    ...editorBundledScripts,
  ];

  for (const scriptPath of scriptCandidates) {
    if (exists(scriptPath)) {
      return {
        binary: nodeBinary,
        argsPrefix: [scriptPath],
        compiler: scriptPath,
        env: { ELECTRON_RUN_AS_NODE: '1' },
      };
    }
  }

  if (platform === 'win32') {
    return null;
  }

  return {
    binary: 'npx',
    argsPrefix: ['tsc'],
    compiler: 'npx tsc',
  };
}

function findTsConfig(projectPath, explicitPath) {
  if (explicitPath) {
    return path.isAbsolute(explicitPath) ? explicitPath : path.join(projectPath, explicitPath);
  }

  const candidates = [
    path.join(projectPath, 'tsconfig.json'),
    path.join(projectPath, 'temp', 'tsconfig.cocos.json'),
  ];

  return candidates.find((candidate) => exists(candidate)) || '';
}

function runExec(file, args, cwd, env = {}) {
  return new Promise((resolve) => {
    execFile(file, args, {
      cwd,
      env: { ...process.env, ...env },
      maxBuffer: 8 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        code: error && typeof error.code === 'number' ? error.code : 0,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : '',
      });
    });
  });
}

function parseTscOutput(output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const diagnostics = [];
  const regex = /^(.*)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/i;
  for (const line of lines) {
    const match = regex.exec(line);
    if (!match) {
      continue;
    }

    diagnostics.push({
      file: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      code: match[4],
      message: match[5],
    });
  }

  return diagnostics;
}

async function runScriptDiagnostics(projectPath, options = {}) {
  const tsconfigPath = findTsConfig(projectPath, options.tsconfigPath);
  if (!tsconfigPath || !exists(tsconfigPath)) {
    return {
      ok: false,
      tool: 'typescript',
      summary: 'No tsconfig.json was found in the Cocos project.',
      diagnostics: [],
      stdout: '',
      stderr: '',
    };
  }

  const command = findTypescriptCommand(projectPath);
  if (!command) {
    return {
      ok: false,
      tool: 'typescript',
      summary: 'TypeScript compiler was not found in the Cocos project or editor installation.',
      diagnostics: [],
      stdout: '',
      stderr: '',
    };
  }

  const args = [
    ...command.argsPrefix,
    '--noEmit',
    '-p',
    tsconfigPath,
    '--pretty',
    'false',
  ];

  const result = await runExec(command.binary, args, projectPath, command.env);
  const mergedOutput = [result.stdout, result.stderr, result.error].filter(Boolean).join('\n').trim();
  const diagnostics = parseTscOutput(mergedOutput);
  const ok = result.code === 0 && diagnostics.length === 0;

  return {
    ok,
    tool: 'typescript',
    binary: command.binary,
    compiler: command.compiler,
    tsconfigPath,
    exitCode: result.code,
    summary: ok
      ? 'TypeScript diagnostics completed successfully with no errors.'
      : diagnostics.length
        ? `Found ${diagnostics.length} TypeScript error(s).`
        : mergedOutput || 'TypeScript diagnostics reported a non-zero exit code.',
    diagnostics,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

module.exports = {
  findTypescriptCommand,
  runScriptDiagnostics,
};
