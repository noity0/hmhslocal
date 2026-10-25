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

export function validateConfig(input: unknown): Partial<HmhslocalConfig> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Config input must be a non-null JSON object');
  }

  const raw = input as Record<string, any>;
  const validated: Partial<HmhslocalConfig> = {};

  // Prototype pollution protection
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const k of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(raw, k) || k in raw) {
      delete raw[k];
    }
  }

  // 1. ollamaUrl validation & SSRF defense
  if (raw.ollamaUrl !== undefined) {
    if (typeof raw.ollamaUrl !== 'string' || !raw.ollamaUrl.trim()) {
      throw new Error('ollamaUrl must be a non-empty string');
    }
    let parsed: URL;
    try {
      parsed = new URL(raw.ollamaUrl.trim());
    } catch {
      throw new Error(`Invalid ollamaUrl format: "${raw.ollamaUrl}" is not a valid URL`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Invalid ollamaUrl protocol "${parsed.protocol}". Only http: and https: are allowed.`);
    }

    // SSRF guard against cloud metadata endpoints
    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = [
      '169.254.169.254',
      'metadata.google.internal',
      'metadata.local',
      '100.100.100.200',
    ];
    if (blockedHosts.includes(hostname)) {
      throw new Error(`SSRF guard blocked access to metadata endpoint: "${hostname}"`);
    }

    validated.ollamaUrl = parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
  }

  // 2. defaultModel validation
  if (raw.defaultModel !== undefined) {
    if (typeof raw.defaultModel !== 'string' || !raw.defaultModel.trim()) {
      throw new Error('defaultModel must be a non-empty string');
    }
    const sanitized = raw.defaultModel.trim();
    if (!/^[a-zA-Z0-9_\-.:/]+$/.test(sanitized)) {
      throw new Error(`Invalid model name: "${sanitized}" contains illegal characters`);
    }
    validated.defaultModel = sanitized;
  }

  // 3. temperature validation (0.0 to 2.0)
  if (raw.temperature !== undefined) {
    const temp = Number(raw.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      throw new Error('temperature must be a number between 0.0 and 2.0');
    }
    validated.temperature = Number(temp.toFixed(2));
  }

  // 4. contextSize validation (512 to 131072)
  if (raw.contextSize !== undefined) {
    const ctx = Number(raw.contextSize);
    if (!Number.isInteger(ctx) || ctx < 512 || ctx > 131072) {
      throw new Error('contextSize must be an integer between 512 and 131,072');
    }
    validated.contextSize = ctx;
  }

  // 5. autoApproveSafeCommands validation
  if (raw.autoApproveSafeCommands !== undefined) {
    if (typeof raw.autoApproveSafeCommands !== 'boolean') {
      throw new Error('autoApproveSafeCommands must be a boolean');
    }
    validated.autoApproveSafeCommands = raw.autoApproveSafeCommands;
  }

  // 6. maxSelfRepairAttempts validation (1 to 10)
  if (raw.maxSelfRepairAttempts !== undefined) {
    const repair = Number(raw.maxSelfRepairAttempts);
    if (!Number.isInteger(repair) || repair < 1 || repair > 10) {
      throw new Error('maxSelfRepairAttempts must be an integer between 1 and 10');
    }
    validated.maxSelfRepairAttempts = repair;
  }

  // 7. provider validation
  if (raw.provider !== undefined) {
    if (raw.provider !== 'ollama' && raw.provider !== 'gemini' && raw.provider !== 'mock') {
      throw new Error('provider must be one of: "ollama", "gemini", "mock"');
    }
    validated.provider = raw.provider;
  }

  // 8. githubRepo validation
  if (raw.githubRepo !== undefined) {
    if (typeof raw.githubRepo !== 'string' || !raw.githubRepo.trim()) {
      throw new Error('githubRepo must be a non-empty string');
    }
    const repo = raw.githubRepo.trim();
    if (!/^[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+$/.test(repo)) {
      throw new Error(`githubRepo must follow "owner/repo" format: "${repo}"`);
    }
    validated.githubRepo = repo;
  }

  // 9. workspaceRoot validation
  if (raw.workspaceRoot !== undefined) {
    if (typeof raw.workspaceRoot !== 'string' || !raw.workspaceRoot.trim()) {
      throw new Error('workspaceRoot must be a non-empty string path');
    }
    validated.workspaceRoot = path.resolve(raw.workspaceRoot.trim());
  }

  return validated;
}

export function loadConfig(): HmhslocalConfig {
  const cfg = { ...DEFAULT_CONFIG };
  const cfgPath = getConfigPath();

  if (fs.existsSync(cfgPath)) {
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const validated = validateConfig(parsed);
      Object.assign(cfg, validated);
    } catch {
      // Ignore corrupted files, keep safe defaults
    }
  }

  // Environment variable overrides (highest precedence)
  if (process.env.OLLAMA_HOST) {
    try {
      const v = validateConfig({ ollamaUrl: process.env.OLLAMA_HOST });
      if (v.ollamaUrl) cfg.ollamaUrl = v.ollamaUrl;
    } catch {
      // ignore invalid env var
    }
  }
  if (process.env.HMHSLOCAL_OLLAMA_URL) {
    try {
      const v = validateConfig({ ollamaUrl: process.env.HMHSLOCAL_OLLAMA_URL });
      if (v.ollamaUrl) cfg.ollamaUrl = v.ollamaUrl;
    } catch {
      // ignore
    }
  }
  if (process.env.HMHSLOCAL_MODEL) {
    try {
      const v = validateConfig({ defaultModel: process.env.HMHSLOCAL_MODEL });
      if (v.defaultModel) cfg.defaultModel = v.defaultModel;
    } catch {
      // ignore
    }
  }
  if (process.env.HMHSLOCAL_PROVIDER) {
    try {
      const v = validateConfig({ provider: process.env.HMHSLOCAL_PROVIDER });
      if (v.provider) cfg.provider = v.provider;
    } catch {
      // ignore
    }
  }

  return cfg;
}

export function saveConfig(updates: unknown): HmhslocalConfig {
  const validated = validateConfig(updates);
  const current = loadConfig();
  const merged: HmhslocalConfig = { ...current, ...validated };

  const targetPath = getConfigPath();
  try {
    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err: any) {
    throw new Error(`Failed to save config to ${targetPath}: ${err.message}`);
  }

  return merged;
}
