import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceManager } from '../src/core/workspace.ts';
import { MockProvider } from '../src/core/provider.ts';
import { CodingAgent } from '../src/core/agent.ts';
import { loadConfig } from '../src/core/config.ts';

describe('Autonomous AI Coding Agent', () => {
  const tempDir = path.join(os.tmpdir(), `hmhslocal-agent-test-${Date.now()}`);
  let ws: WorkspaceManager;
  let mockProvider: MockProvider;
  let agent: CodingAgent;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    ws = new WorkspaceManager(tempDir);
    mockProvider = new MockProvider();
    const config = {
      ...loadConfig(),
      workspaceRoot: tempDir,
      autoApproveSafeCommands: true,
      maxSelfRepairAttempts: 2,
    };
    agent = new CodingAgent(ws, mockProvider, config);
  });

  after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('generates line-by-line unified diffs correctly', () => {
    const oldCode = 'function greet() {\n  return "hi";\n}';
    const newCode = 'function greet() {\n  return "hello world";\n}';
    const diff = agent.generateDiff('greet.ts', oldCode, newCode);

    assert.ok(diff.includes('--- a/greet.ts'));
    assert.ok(diff.includes('+++ b/greet.ts'));
    assert.ok(diff.includes('-   return "hi";'));
    assert.ok(diff.includes('+   return "hello world";'));
  });

  it('executes coding task end-to-end and writes files into workspace', async () => {
    mockProvider.setResponse(
      'Analyze the user',
      '1. Create utility module\n2. Export calculate function\n3. Verify output'
    );
    mockProvider.setResponse(
      'Generate the exact source code',
      JSON.stringify([
        {
          path: 'src/math.ts',
          action: 'create',
          content: 'export function add(a: number, b: number): number { return a + b; }',
        },
      ])
    );

    const diffsEmitted: string[] = [];
    const result = await agent.executeTask(
      {
        prompt: 'Create a math utility module with an add function',
        runVerification: false,
      },
      {
        onFileDiff: (filePath, diff) => {
          diffsEmitted.push(filePath);
        },
      }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.filesChanged.length, 1);
    assert.strictEqual(path.normalize(result.filesChanged[0].filePath), path.join('src', 'math.ts'));
    assert.ok(ws.fileExists('src/math.ts'));
    assert.strictEqual(
      ws.readFile('src/math.ts'),
      'export function add(a: number, b: number): number { return a + b; }'
    );
    assert.ok(diffsEmitted.length > 0);
  });
});
