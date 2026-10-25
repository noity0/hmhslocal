import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceManager, WorkspaceSecurityError } from '../src/core/workspace.ts';

describe('Workspace Security and File Operations', () => {
  const tempDir = path.join(os.tmpdir(), `hmhslocal-test-${Date.now()}`);
  let ws: WorkspaceManager;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    ws = new WorkspaceManager(tempDir);
  });

  after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('allows access to valid paths within the workspace root', () => {
    const resolved = ws.resolveSafePath('src/sample.ts');
    assert.strictEqual(resolved, path.join(tempDir, 'src', 'sample.ts'));
  });

  it('blocks path traversal attacks attempting to escape workspace', () => {
    assert.throws(
      () => ws.resolveSafePath('../outside.txt'),
      WorkspaceSecurityError,
      'Should throw WorkspaceSecurityError for ../'
    );

    assert.throws(
      () => ws.resolveSafePath('../../etc/passwd'),
      WorkspaceSecurityError,
      'Should throw WorkspaceSecurityError for deep traversal'
    );
  });

  it('creates parent directories and writes files safely', () => {
    const res = ws.writeFile('nested/module/test.txt', 'Hello HMHSLOCAL');
    assert.strictEqual(res.path, path.join('nested', 'module', 'test.txt'));
    assert.ok(ws.fileExists('nested/module/test.txt'));
    const content = ws.readFile('nested/module/test.txt');
    assert.strictEqual(content, 'Hello HMHSLOCAL');
  });

  it('patches files accurately with search and replace', () => {
    ws.writeFile('patch-target.txt', 'const mode = "development";');
    const patchResult = ws.patchFile('patch-target.txt', '"development"', '"production"');
    assert.strictEqual(patchResult.occurrencesReplaced, 1);
    const updated = ws.readFile('patch-target.txt');
    assert.strictEqual(updated, 'const mode = "production";');
  });

  it('throws an error when patch target string is not found', () => {
    assert.throws(() => {
      ws.patchFile('patch-target.txt', 'NON_EXISTENT_STRING', 'replacement');
    });
  });

  it('lists directory entries within the workspace', () => {
    ws.writeFile('file1.txt', 'A');
    ws.writeFile('file2.txt', 'B');
    const items = ws.listDirectory();
    assert.ok(items.length >= 2);
    const names = items.map((i) => i.name);
    assert.ok(names.includes('file1.txt'));
    assert.ok(names.includes('file2.txt'));
  });

  it('finds files matching search criteria', () => {
    const files = ws.findFiles({ extension: '.txt' });
    assert.ok(files.length >= 2);
  });

  it('runs approved commands and captures output and exit code', async () => {
    const cmdResult = await ws.runCommand('node -e "console.log(\'cmd-test-ok\')"');
    assert.strictEqual(cmdResult.exitCode, 0);
    assert.ok(cmdResult.stdout.includes('cmd-test-ok'));
  });
});
