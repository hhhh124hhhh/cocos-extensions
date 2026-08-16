'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectPath } = require('./path-safety');

const DEFAULT_LOG_DIRS = [
  'temp/logs',
  'temp',
  'logs',
  'local/logs',
  'local',
];
const LOG_EXTENSIONS = new Set(['.log', '.txt']);
const MAX_READ_BYTES = 2 * 1024 * 1024;

function normalizeLimit(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function shouldSkipDirectory(name) {
  return name === '.git' || name === 'node_modules' || name === 'library';
}

function isLogFile(fileName) {
  return LOG_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

function collectLogFiles(rootDir, maxDepth, limit) {
  const files = [];
  const stack = [{ dir: rootDir, depth: 0 }];

  while (stack.length && files.length < limit) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < maxDepth && !shouldSkipDirectory(entry.name)) {
          stack.push({ dir: fullPath, depth: current.depth + 1 });
        }
        continue;
      }

      if (!entry.isFile() || !isLogFile(entry.name)) {
        continue;
      }

      const stat = safeStat(fullPath);
      if (stat) {
        files.push({ fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
      }
      if (files.length >= limit) {
        break;
      }
    }
  }

  return files;
}

function findProjectLogFiles(projectPath, options = {}) {
  const limit = normalizeLimit(options.limit, 20, 1, 200);
  const maxDepth = normalizeLimit(options.maxDepth, 2, 0, 5);
  const directories = options.directory
    ? [options.directory]
    : DEFAULT_LOG_DIRS;
  const seen = new Set();
  const files = [];

  for (const directory of directories) {
    let rootDir;
    try {
      rootDir = resolveProjectPath(projectPath, directory);
    } catch (error) {
      continue;
    }
    if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
      continue;
    }

    for (const file of collectLogFiles(rootDir, maxDepth, limit)) {
      if (seen.has(file.fullPath)) {
        continue;
      }
      seen.add(file.fullPath);
      files.push(file);
      if (files.length >= limit) {
        break;
      }
    }
    if (files.length >= limit) {
      break;
    }
  }

  return files
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, limit);
}

function readTail(filePath, maxLines = 80) {
  const stat = safeStat(filePath);
  if (!stat) {
    return '';
  }

  const size = Math.min(stat.size, MAX_READ_BYTES);
  const buffer = Buffer.alloc(size);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buffer, 0, size, stat.size - size);
  } finally {
    fs.closeSync(fd);
  }

  return buffer
    .toString('utf8')
    .replace(/\s+$/g, '')
    .split(/\r?\n/)
    .slice(-normalizeLimit(maxLines, 80, 1, 1000))
    .join('\n')
    .trim();
}

function getRecentProjectLogs(projectPath, options = {}) {
  const maxLines = normalizeLimit(options.lines, 80, 1, 1000);
  return findProjectLogFiles(projectPath, options).map((file) => ({
    path: path.relative(projectPath, file.fullPath).replace(/\\/g, '/'),
    size: file.size,
    mtime: new Date(file.mtimeMs).toISOString(),
    text: readTail(file.fullPath, maxLines),
  }));
}

function searchProjectLogs(projectPath, options = {}) {
  const query = String(options.query || '').trim();
  if (!query) {
    throw new Error('query is required.');
  }

  const limit = normalizeLimit(options.limit, 50, 1, 500);
  const flags = options.caseSensitive ? '' : 'i';
  const pattern = options.regex ? new RegExp(query, flags) : null;
  const lowerQuery = query.toLowerCase();
  const results = [];

  for (const file of findProjectLogFiles(projectPath, { ...options, limit: normalizeLimit(options.fileLimit, 40, 1, 200) })) {
    const text = readTail(file.fullPath, normalizeLimit(options.linesPerFile, 2000, 1, 10000));
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const matched = pattern
        ? pattern.test(line)
        : (options.caseSensitive ? line.includes(query) : line.toLowerCase().includes(lowerQuery));
      if (!matched) {
        continue;
      }

      results.push({
        path: path.relative(projectPath, file.fullPath).replace(/\\/g, '/'),
        line: index + 1,
        text: line,
      });
      if (results.length >= limit) {
        return { query, count: results.length, matches: results };
      }
    }
  }

  return { query, count: results.length, matches: results };
}

function clearProjectLogFiles(projectPath, options = {}) {
  const cleared = [];
  for (const file of findProjectLogFiles(projectPath, options)) {
    fs.truncateSync(file.fullPath, 0);
    cleared.push(path.relative(projectPath, file.fullPath).replace(/\\/g, '/'));
  }
  return cleared;
}

module.exports = {
  findProjectLogFiles,
  getRecentProjectLogs,
  searchProjectLogs,
  clearProjectLogFiles,
};
