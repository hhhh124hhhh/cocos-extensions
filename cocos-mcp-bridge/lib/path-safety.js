'use strict';

const path = require('path');

function normalizeRoot(projectPath) {
  return path.resolve(String(projectPath || process.cwd()));
}

function isPathInside(rootPath, targetPath) {
  const root = normalizeRoot(rootPath);
  const target = path.resolve(String(targetPath || ''));
  const relative = path.relative(root, target);
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveProjectPath(projectPath, rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error('path is required.');
  }

  const root = normalizeRoot(projectPath);
  const targetPath = path.isAbsolute(rawPath)
    ? path.resolve(rawPath)
    : path.resolve(root, rawPath);

  if (!isPathInside(root, targetPath)) {
    throw new Error(`Path is outside the Cocos project: ${rawPath}`);
  }

  return targetPath;
}

module.exports = {
  isPathInside,
  resolveProjectPath,
};
