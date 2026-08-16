'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  assertJavascriptSafety,
  inspectJavascriptSafety,
} = require('../lib/javascript-safety');

const PROJECT_PATH = path.resolve('/tmp/funplay-cocos-test-project');

test('JavaScript safety allows project-local write snippets by default', () => {
  const result = inspectJavascriptSafety(
    "fs.writeFileSync(path.join(context.projectPath, 'assets/generated.ts'), 'export {};');",
    { projectPath: PROJECT_PATH }
  );

  assert.equal(result.ok, true);
});

test('JavaScript safety blocks delete operations', () => {
  assert.throws(
    () => assertJavascriptSafety("fs.rmSync(path.join(context.projectPath, 'assets'), { recursive: true });", {
      projectPath: PROJECT_PATH,
    }),
    /delete\/truncate/
  );
});

test('JavaScript safety blocks traversal and home path literals', () => {
  const result = inspectJavascriptSafety(
    "fs.writeFileSync('../outside.txt', 'x'); fs.writeFileSync('~/secret.txt', 'x');",
    { projectPath: PROJECT_PATH }
  );

  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.includes('path traversal')), true);
  assert.equal(result.violations.some((item) => item.includes('user-home')), true);
});

test('JavaScript safety blocks absolute paths outside the project', () => {
  const result = inspectJavascriptSafety("fs.writeFileSync('/tmp/outside.txt', 'x');", {
    projectPath: PROJECT_PATH,
  });

  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.includes('absolute path outside')), true);
});

test('JavaScript safety blocks child_process usage', () => {
  assert.throws(
    () => assertJavascriptSafety("const cp = require('child_process'); cp.execSync('rm -rf /tmp/x');", {
      projectPath: PROJECT_PATH,
    }),
    /child_process/
  );
});
