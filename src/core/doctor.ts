/**
 * System Diagnostics and Environment Doctor for hmhslocal
 * Validates Node.js version, platform, Ollama connectivity, Git repo, and path compatibility.
 * Provides actionable hints for issues.
 */

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { OllamaClient } from './ollamaClient.ts';
import { loadConfig } from './config.ts';
import type { HmhslocalConfig } from './config.ts';

export interface DoctorCheckItem {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  remediation?: string;
}

export interface DoctorReport {
  timestamp: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  workspaceRoot: string;
  allChecksPassed: boolean;
  checks: DoctorCheckItem[];
}

export class EnvironmentDoctor {
  private config: HmhslocalConfig;

  constructor(config?: HmhslocalConfig) {
    this.config = config || loadConfig();
  }

  public async runDiagnostics(): Promise<DoctorReport> {
    const checks: DoctorCheckItem[] = [];
    const cwd = process.cwd();

    // 1. Node.js Version Check
    const nodeVer = process.version;
    const majorVer = parseInt(nodeVer.replace(/^v/, '').split('.')[0], 10);
    if (majorVer >= 18) {
      checks.push({
        id: 'node-version',
        name: 'Node.js Runtime',
        status: 'pass',
        message: `${nodeVer} (Supported, >= v18 required)`,
      });
    } else {
      checks.push({
        id: 'node-version',
        name: 'Node.js Runtime',
        status: 'fail',
        message: `${nodeVer} is outdated (v18+ required)`,
        remediation: 'Download and install current LTS from https://nodejs.org/',
      });
    }

    // 2. Workspace Path Space & Windows Safety Check
    const hasSpaces = cwd.includes(' ');
    const isWindows = process.platform === 'win32';
    if (hasSpaces) {
      checks.push({
        id: 'path-spaces',
        name: 'Path Spaces Safety',
        status: 'warn',
        message: `Workspace path contains spaces ("${cwd}")`,
        remediation: isWindows
          ? 'Ensure all CMD batch invocations use quotes: node "%~dp0\\hmhslocal.js" %*'
          : 'Wrap CLI invocations in quotes.',
      });
    } else {
      checks.push({
        id: 'path-spaces',
        name: 'Path Spaces Safety',
        status: 'pass',
        message: 'No hazardous whitespace in workspace path.',
      });
    }

    // 3. Workspace Write Permissions
    try {
      const probeFile = path.join(cwd, '.hmhslocal-probe.tmp');
      fs.writeFileSync(probeFile, 'ok', 'utf-8');
      fs.unlinkSync(probeFile);
      checks.push({
        id: 'workspace-write',
        name: 'Workspace Write Permissions',
        status: 'pass',
        message: `Full read/write access confirmed in ${cwd}`,
      });
    } catch (err: any) {
      checks.push({
        id: 'workspace-write',
        name: 'Workspace Write Permissions',
        status: 'fail',
        message: `Cannot write to workspace: ${err.message}`,
        remediation: 'Check user folder permissions or run terminal as Administrator.',
      });
    }

    // 4. Git Installation & Remote Configuration
    try {
      const gitVer = execSync('git --version', { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      let remoteUrl = 'none';
      try {
        remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      } catch {
        // No remote yet
      }

      checks.push({
        id: 'git-repo',
        name: 'Git Version Control',
        status: 'pass',
        message: `${gitVer} (Origin: ${remoteUrl})`,
      });
    } catch {
      checks.push({
        id: 'git-repo',
        name: 'Git Version Control',
        status: 'warn',
        message: 'git binary not detected in system PATH',
        remediation: 'Install Git from https://git-scm.com/ to enable automated commit and push.',
      });
    }

    // 5. Ollama Daemon Reachability Check
    const ollama = new OllamaClient(this.config.ollamaUrl);
    const ollamaStatus = await ollama.checkHealth();

    if (ollamaStatus.reachable) {
      const modelCount = ollamaStatus.models.length;
      checks.push({
        id: 'ollama-status',
        name: 'Local Ollama Daemon',
        status: modelCount > 0 ? 'pass' : 'warn',
        message: `Connected at ${ollamaStatus.url} (Ollama v${ollamaStatus.version}, ${modelCount} models installed)`,
        remediation:
          modelCount === 0
            ? 'No models installed yet. Run "ollama pull llama3.2" or "hmhslocal pull llama3.2"'
            : undefined,
      });
    } else {
      checks.push({
        id: 'ollama-status',
        name: 'Local Ollama Daemon',
        status: 'warn',
        message: `Unreachable at ${this.config.ollamaUrl}`,
        remediation: ollamaStatus.hint || 'Start Ollama with: ollama serve',
      });
    }

    // 6. Config File Check
    checks.push({
      id: 'config-status',
      name: 'Agent Configuration',
      status: 'pass',
      message: `Provider: ${this.config.provider} · Model: ${this.config.defaultModel} · Auto-Approve: ${this.config.autoApproveSafeCommands}`,
    });

    const allPassed = checks.every((c) => c.status !== 'fail');

    return {
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      workspaceRoot: cwd,
      allChecksPassed: allPassed,
      checks,
    };
  }
}
