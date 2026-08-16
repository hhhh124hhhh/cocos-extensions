'use strict';

const fs = require('fs');
const path = require('path');
const { queryAssetInfo } = require('./assets');
const { resolveProjectPath } = require('./path-safety');

function requestEditorMessage(channel, method, ...args) {
  if (!global.Editor || !Editor.Message || typeof Editor.Message.request !== 'function') {
    throw new Error('Editor.Message.request is unavailable in the Cocos extension host.');
  }
  return Editor.Message.request(channel, method, ...args);
}

function normalizeSceneTarget(projectPath, target) {
  const raw = String(target || '').trim().replace(/\\/g, '/');
  if (!raw) {
    throw new Error('target is required.');
  }

  let relative = raw;
  if (relative.startsWith('db://assets/')) {
    relative = relative.slice('db://'.length);
  } else if (relative.startsWith('/assets/')) {
    relative = relative.slice(1);
  } else if (!relative.startsWith('assets/')) {
    relative = `assets/${relative}`;
  }

  if (!relative.endsWith('.scene')) {
    relative = `${relative}.scene`;
  }

  const filePath = resolveProjectPath(projectPath, relative);
  const assetsRoot = path.join(projectPath, 'assets');
  const relativeToAssets = path.relative(assetsRoot, filePath);
  if (relativeToAssets.startsWith('..') || path.isAbsolute(relativeToAssets)) {
    throw new Error('target must be inside the Cocos assets directory.');
  }

  const projectRelative = path.relative(projectPath, filePath).replace(/\\/g, '/');
  return {
    filePath,
    projectRelative,
    dbUrl: `db://${projectRelative}`,
    sceneName: path.basename(filePath, '.scene'),
  };
}

async function queryAssetInfoOptional(target) {
  try {
    return await queryAssetInfo(target);
  } catch (error) {
    return null;
  }
}

async function saveSceneContent(projectPath, options = {}) {
  const target = normalizeSceneTarget(projectPath, options.target);
  const content = String(options.content || '');
  if (!content) {
    throw new Error('content is required.');
  }

  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed) || !parsed.some((entry) => entry && entry.__type__ === 'cc.SceneAsset')) {
    throw new Error('content must contain a serialized cc.SceneAsset.');
  }

  const existed = fs.existsSync(target.filePath);
  if (existed && options.overwrite !== true) {
    throw new Error(`Target scene already exists: ${target.projectRelative}`);
  }

  fs.mkdirSync(path.dirname(target.filePath), { recursive: true });

  let method = 'fs-write';
  let result;
  if (global.Editor && Editor.Message && typeof Editor.Message.request === 'function') {
    if (existed) {
      try {
        result = await requestEditorMessage('asset-db', 'save-asset', target.dbUrl, content);
        method = 'asset-db:save-asset';
        if (!fs.existsSync(target.filePath) || fs.readFileSync(target.filePath, 'utf8').trimEnd() !== content.trimEnd()) {
          fs.writeFileSync(target.filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
        }
      } catch (error) {
        fs.writeFileSync(target.filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
        result = { fallbackReason: error.message };
      }
    } else {
      try {
        result = await requestEditorMessage('asset-db', 'create-asset', target.dbUrl, content);
        method = 'asset-db:create-asset';
      } catch (error) {
        if (fs.existsSync(target.filePath)) {
          result = { fallbackReason: error.message, fileCreated: true };
        } else {
          throw error;
        }
      }
    }
  } else {
    fs.writeFileSync(target.filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  }

  const fileExists = fs.existsSync(target.filePath);
  const info = await queryAssetInfoOptional(target.dbUrl);
  if (!fileExists && !info) {
    throw new Error(`Scene was not created: ${target.projectRelative}`);
  }

  return {
    created: !existed,
    overwritten: existed && options.overwrite === true,
    method,
    result,
    dbUrl: target.dbUrl,
    path: target.projectRelative,
    sceneName: target.sceneName,
    fileExists,
    info,
  };
}

module.exports = {
  normalizeSceneTarget,
  saveSceneContent,
};
