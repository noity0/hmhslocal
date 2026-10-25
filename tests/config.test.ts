import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadConfig, saveConfig, HmhslocalConfig } from '../src/core/config.ts';

describe('Config Manager', () => {
  it('loads valid default configurations', () => {
    const config = loadConfig();
    assert.ok(config.ollamaUrl, 'Ollama URL should be present');
    assert.ok(config.defaultModel, 'Default model should be present');
    assert.strictEqual(typeof config.temperature, 'number');
    assert.ok(config.temperature >= 0 && config.temperature <= 2);
    assert.strictEqual(typeof config.autoApproveSafeCommands, 'boolean');
    assert.strictEqual(typeof config.maxSelfRepairAttempts, 'number');
    assert.strictEqual(config.githubRepo, 'noity0/hmhslocal');
  });

  it('respects environment variable overrides', () => {
    const originalHost = process.env.OLLAMA_HOST;
    const originalModel = process.env.HMHSLOCAL_MODEL;

    try {
      process.env.OLLAMA_HOST = 'http://192.168.1.100:11434';
      process.env.HMHSLOCAL_MODEL = 'qwen2.5-coder:32b';

      const config = loadConfig();
      assert.strictEqual(config.ollamaUrl, 'http://192.168.1.100:11434');
      assert.strictEqual(config.defaultModel, 'qwen2.5-coder:32b');
    } finally {
      process.env.OLLAMA_HOST = originalHost;
      process.env.HMHSLOCAL_MODEL = originalModel;
    }
  });

  it('clamps temperature within safe bounds', () => {
    const config = loadConfig();
    assert.ok(config.temperature >= 0 && config.temperature <= 2);
  });
});
