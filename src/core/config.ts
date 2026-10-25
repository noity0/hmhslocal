/**
 * Type-safe Configuration Manager for hmhslocal
 * Reads from ~/.hmhslocalrc or ./.hmhslocalrc, with environment variable overrides.
 * Never stores or exposes secrets in plaintext logs.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface HmhslocalConfig {
  ollamaUrl: string;
  defaultModel: string;
  temperature: number;
  contextSize: number;
  autoApproveSafeCommands: boolean;
  maxSelfRepairAttempts: number;
  workspaceRoot: string;
  provider: 'ollama' | 'gemini' | 'mock';
  githubRepo: string;
}

const DEFAULT_CONFIG: HmhslocalConfig = {
  ollamaUrl: process.env.OLLAMA_HOST || process.env.HMHSLOCAL_OLLAMA_URL || 'http://127.0.0.1:11434',
  defaultModel: process.env.HMHSLOCAL_MODEL || 'llama3.2:latest',
  temperature: 0.2,
  contextSize: 8192,
  autoApproveSafeCommands: false,
  maxSelfRepairAttempts: 3,
  workspaceRoot: process.cwd(),
  provider: (process.env.HMHSLOCAL_PROVIDER as any) || 'ollama',
  githubRepo: 'noity0/hmhslocal',
};

export function getConfigPath(): string {
  // Check local project config first, then user home directory
  const localPath = path.join(process.cwd(), '.hmhslocalrc');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return path.join(os.homedir() || '.', '.hmhslocalrc');
}

export function loadConfig(): HmhslocalConfig {
  const cfg = { ...DEFAULT_CONFIG };
  const cfgPath = getConfigPath();

  if (fs.existsSync(cfgPath)) {
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.ollamaUrl === 'string') cfg.ollamaUrl = parsed.ollamaUrl;
        if (typeof parsed.defaultModel === 'string') cfg.defaultModel = parsed.defaultModel;
        if (typeof parsed.temperature === 'number') cfg.temperature = Math.max(0, Math.min(2, parsed.temperature));
        if (typeof parsed.contextSize === 'number') cfg.contextSize = Math.max(512, parsed.contextSize);
        if (typeof parsed.autoApproveSafeCommands === 'boolean') cfg.autoApproveSafeCommands = parsed.autoApproveSafeCommands;
        if (typeof parsed.maxSelfRepairAttempts === 'number') cfg.maxSelfRepairAttempts = parsed.maxSelfRepairAttempts;
        if (typeof parsed.githubRepo === 'string') cfg.githubRepo = parsed.githubRepo;
        if (parsed.provider === 'ollama' || parsed.provider === 'gemini' || parsed.provider === 'mock') {
          cfg.provider = parsed.provider;
        }
      }
    } catch {
      // Ignore parse errors, use defaults safely
    }
  }

  // Environment variable overrides (highest precedence)
  if (process.env.OLLAMA_HOST) cfg.ollamaUrl = process.env.OLLAMA_HOST;
  if (process.env.HMHSLOCAL_OLLAMA_URL) cfg.ollamaUrl = process.env.HMHSLOCAL_OLLAMA_URL;
  if (process.env.HMHSLOCAL_MODEL) cfg.defaultModel = process.env.HMHSLOCAL_MODEL;
  if (process.env.HMHSLOCAL_PROVIDER) cfg.provider = process.env.HMHSLOCAL_PROVIDER as any;

  return cfg;
}

export function saveConfig(updates: Partial<HmhslocalConfig>): HmhslocalConfig {
  const current = loadConfig();
  const merged = { ...current, ...updates };

  const targetPath = getConfigPath();
  try {
    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err: any) {
    throw new Error(`Failed to save config to ${targetPath}: ${err.message}`);
  }

  return merged;
}
