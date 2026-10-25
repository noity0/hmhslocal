import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OllamaProvider, GeminiProvider, MockProvider, getAIProvider } from '../src/core/provider.ts';
import { loadConfig } from '../src/core/config.ts';

describe('AI Providers and Truthfulness', () => {
  it('correctly marks Ollama as local execution', () => {
    const ollama = new OllamaProvider('http://127.0.0.1:11434');
    assert.strictEqual(ollama.isLocal, true, 'Ollama must be marked isLocal: true');
    assert.strictEqual(ollama.id, 'ollama');
  });

  it('strictly marks Gemini as remote cloud execution (isLocal: false)', () => {
    const gemini = new GeminiProvider('dummy-key');
    assert.strictEqual(gemini.isLocal, false, 'Gemini must NEVER be marked as local execution');
    assert.strictEqual(gemini.id, 'gemini');
  });

  it('MockProvider streams deterministic responses', async () => {
    const mock = new MockProvider();
    mock.setResponse('hello', 'Hello from mock AI engine');

    const chunks: string[] = [];
    const res = await mock.chatStream(
      'mock-model',
      [{ role: 'user', content: 'hello' }],
      (chunk) => chunks.push(chunk)
    );

    assert.ok(res.text.includes('Hello from mock AI engine'));
    assert.ok(chunks.length > 0);
    assert.strictEqual(res.provider, 'mock');
  });

  it('factory correctly resolves configured provider', () => {
    const cfg = loadConfig();
    const provider = getAIProvider({ ...cfg, provider: 'mock' });
    assert.strictEqual(provider.id, 'mock');
  });
});
