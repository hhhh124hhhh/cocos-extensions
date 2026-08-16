'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getRecentProjectLogs, searchProjectLogs } = require('../lib/logs');

test('project log helpers read and search common project log files', () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'funplay-cocos-logs-'));
  const logDir = path.join(projectPath, 'temp', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'editor.log'), 'first line\nError: broken scene\nlast line\n', 'utf8');

  const recent = getRecentProjectLogs(projectPath, { limit: 5, lines: 2 });
  assert.equal(recent.length, 1);
  assert.match(recent[0].text, /broken scene/);

  const matches = searchProjectLogs(projectPath, { query: 'broken', limit: 5 });
  assert.equal(matches.count, 1);
  assert.equal(matches.matches[0].path, 'temp/logs/editor.log');
});
