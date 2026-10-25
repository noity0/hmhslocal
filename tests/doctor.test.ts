import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EnvironmentDoctor } from '../src/core/doctor.ts';
import { loadConfig } from '../src/core/config.ts';

describe('Environment Doctor', () => {
  it('runs all diagnostic checks and produces structured report', async () => {
    const config = loadConfig();
    const doctor = new EnvironmentDoctor(config);
    const report = await doctor.runDiagnostics();

    assert.ok(report.timestamp);
    assert.ok(report.platform);
    assert.ok(report.nodeVersion);
    assert.ok(report.checks.length >= 5);

    const checkIds = report.checks.map((c) => c.id);
    assert.ok(checkIds.includes('node-version'));
    assert.ok(checkIds.includes('path-spaces'));
    assert.ok(checkIds.includes('workspace-write'));
    assert.ok(checkIds.includes('ollama-status'));
    assert.ok(checkIds.includes('config-status'));

    const nodeCheck = report.checks.find((c) => c.id === 'node-version');
    assert.strictEqual(nodeCheck?.status, 'pass');
  });
});
