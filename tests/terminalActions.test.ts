import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { runSimpleTerminalAction } from '../src/core/terminalActions.ts';
import type { WorkspaceManager } from '../src/core/workspace.ts';

function fakeWorkspace(overrides: Record<string, unknown> = {}) {
  const base = {
    getRoot: () => 'D:\\workspace',
    findFiles: () => ['README.md', 'src\\main.ts'],
    runCommand: async (command: string) => ({
      command, exitCode: 0, stdout: 'ok', stderr: '', durationMs: 1,
    }),
  };
  return { ...base, ...overrides } as unknown as WorkspaceManager;
}

describe('Plain-language terminal actions', () => {
  it('handles a greeting without calling an AI provider or shell command', async () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      const handled = await runSimpleTerminalAction('hi', fakeWorkspace(), async () => true);
      assert.equal(handled, true);
      assert.match(logs.join(' '), /running in this terminal/i);
    } finally {
      console.log = originalLog;
    }
  });

  it('lists files for a natural-language request', async () => {
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      const handled = await runSimpleTerminalAction(
        'show me all files in this folder',
        fakeWorkspace(),
        async () => false,
      );
      assert.equal(handled, true);
      assert.match(logs.join(' '), /README\.md/);
      assert.match(logs.join(' '), /main\.ts/);
    } finally {
      console.log = originalLog;
    }
  });

  it('runs both IP and port diagnostics when asked for network ports and IP', async () => {
    const commands: string[] = [];
    const workspace = fakeWorkspace({
      runCommand: async (command: string) => {
        commands.push(command);
        return { command, exitCode: 0, stdout: 'diagnostic output', stderr: '', durationMs: 1 };
      },
    });
    const originalLog = console.log;
    console.log = () => {};
    try {
      const handled = await runSimpleTerminalAction(
        'check network ports and ip',
        workspace,
        async () => false,
      );
      assert.equal(handled, true);
      assert.equal(commands.length, 2);
      if (os.platform() === 'win32') {
        assert.deepEqual(commands, ['ipconfig', 'netstat -ano']);
      } else {
        assert.deepEqual(commands, ['ip addr', 'ss -ltnup']);
      }
    } finally {
      console.log = originalLog;
    }
  });

  it('does not push when uncommitted files are present', async () => {
    const commands: string[] = [];
    let askedForConfirmation = false;
    const workspace = fakeWorkspace({
      runCommand: async (command: string) => {
        commands.push(command);
        return {
          command, exitCode: 0, stdout: '## main\n M README.md', stderr: '', durationMs: 1,
        };
      },
    });
    const originalLog = console.log;
    console.log = () => {};
    try {
      const handled = await runSimpleTerminalAction(
        'push latest changes to GitHub',
        workspace,
        async () => { askedForConfirmation = true; return true; },
      );
      assert.equal(handled, true);
      assert.deepEqual(commands, ['git status --short --branch']);
      assert.equal(askedForConfirmation, false);
    } finally {
      console.log = originalLog;
    }
  });
});
