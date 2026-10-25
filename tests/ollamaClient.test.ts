import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OllamaClient } from '../src/core/ollamaClient.ts';

describe('Ollama Client', () => {
  it('normalizes base URLs by stripping trailing slashes', () => {
    const client = new OllamaClient('http://127.0.0.1:11434///');
    assert.strictEqual(client.getBaseUrl(), 'http://127.0.0.1:11434');
  });

  it('gracefully handles unreachable daemon with actionable hints and no crash', async () => {
    // Port 59999 is intentionally unused to test offline error handling
    const offlineClient = new OllamaClient('http://127.0.0.1:59999', 500);
    const health = await offlineClient.checkHealth();

    assert.strictEqual(health.reachable, false);
    assert.strictEqual(health.models.length, 0);
    assert.ok(health.error, 'Should provide error message');
    assert.ok(health.hint, 'Should provide actionable setup hint');
    assert.ok(health.hint?.includes('ollama serve'), 'Hint should instruct how to start Ollama');
  });
});
