#!/usr/bin/env node

/**
 * hmhslocal - Production Autonomous Local AI Agent for Terminal
 * Control your entire machine in plain English or standard CLI commands.
 * Zero-cloud-leakage local execution via Ollama (default).
 * Fully supported on Windows 11 (cmd.exe & PowerShell), macOS, and Linux.
 */

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Core imports (executed directly by Node 22)
import { loadConfig, saveConfig } from '../src/core/config.ts';
import { OllamaClient } from '../src/core/ollamaClient.ts';
import { WorkspaceManager } from '../src/core/workspace.ts';
import { getAIProvider } from '../src/core/provider.ts';
import { CodingAgent } from '../src/core/agent.ts';
import { EnvironmentDoctor } from '../src/core/doctor.ts';

const args = process.argv.slice(2);
const userQuery = args.join(' ').trim();

// System Platform
const PLATFORM = os.platform();
const IS_WINDOWS = PLATFORM === 'win32';
const IS_MAC = PLATFORM === 'darwin';
const OS_LABEL = IS_WINDOWS ? 'Windows 11 (cmd.exe / PowerShell)' : IS_MAC ? 'Apple macOS' : 'Linux';

// ANSI Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bgDark: '\x1b[48;5;235m',
};

const config = loadConfig();
const workspace = new WorkspaceManager(process.cwd());
const provider = getAIProvider(config);
const ollama = new OllamaClient(config.ollamaUrl);
const agent = new CodingAgent(workspace, provider, config);
const doctor = new EnvironmentDoctor(config);

function printBanner() {
  console.log(`
${C.cyan}${C.bold}  ██╗  ██╗███╗   ███╗██╗  ██╗███████╗██╗      ██████╗  ██████╗ █████╗ ██╗     
  ██║  ██║████╗ ████║██║  ██║██╔════╝██║     ██╔═══██╗██╔════╝██╔══██╗██║     
  ███████║██╔████╔██║███████║███████╗██║     ██║   ██║██║     ███████║██║     
  ██╔══██║██║╚██╔╝██║██╔══██║╚════██║██║     ██║   ██║██║     ██╔══██║██║     
  ██║  ██║██║ ╚═╝ ██║██║  ██║███████║███████╗╚██████╔╝╚██████╗██║  ██║███████╗
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝${C.reset}
  ${C.bold}Production Local AI Agent · Terminal & Coding Assistant${C.reset}
  ${C.gray}Platform: ${C.green}${OS_LABEL}${C.gray} · Model: ${C.cyan}${config.defaultModel}${C.gray} · Provider: ${C.yellow}${provider.name}${C.reset}
  ${C.dim}Talk in simple English or casual words. No fixed syntax required.${C.reset}
`);
}

function printHelp() {
  console.log(`
${C.bold}USAGE:${C.reset}
  hmhslocal [command] [options]
  hmhslocal <natural language instruction in plain English>

${C.bold}CORE COMMANDS:${C.reset}
  ${C.cyan}doctor${C.reset}                   Inspect system health, Node version, Ollama daemon, and paths
  ${C.cyan}chat [prompt]${C.reset}            Interactive chat or single query with streaming responses
  ${C.cyan}code <prompt>${C.reset}            Autonomous coding agent (plans, inspects, edits diffs, tests)
  ${C.cyan}ask <question>${C.reset}           Ask codebase questions or architectural explanations
  ${C.cyan}models${C.reset}                   List locally installed Ollama models and 1,000+ catalog
  ${C.cyan}pull <model>${C.reset}             Download weights for an Ollama model with verified checksum
  ${C.cyan}config [key] [value]${C.reset}     View or update settings (.hmhslocalrc)
  ${C.cyan}help, --help, -h${C.reset}         Show this help screen

${C.bold}NATURAL LANGUAGE EXAMPLES:${C.reset}
  hmhslocal "create a rest api in express with user authentication"
  hmhslocal "fix syntax errors in server.ts"
  hmhslocal "run tests and summarize failures"
  hmhslocal "pull deepseek-r1"
  hmhslocal "what files are in this folder"
`);
}

/**
 * Doctor Diagnostic Command
 */
async function runDoctorCommand() {
  console.log(`\n${C.bold}Running Environment Diagnostics...${C.reset}\n`);
  const report = await doctor.runDiagnostics();

  report.checks.forEach((c) => {
    const icon = c.status === 'pass' ? `${C.green}✔ PASS${C.reset}` : c.status === 'warn' ? `${C.yellow}▲ WARN${C.reset}` : `${C.red}✖ FAIL${C.reset}`;
    console.log(`  ${icon} ${C.bold}${c.name}${C.reset}: ${c.message}`);
    if (c.remediation) {
      console.log(`         ${C.dim}Fix: ${c.remediation}${C.reset}`);
    }
  });

  console.log(`\n${report.allChecksPassed ? C.green + '✔ All core checks passed.' : C.yellow + '▲ Some warnings detected.'}${C.reset}\n`);
}

/**
 * Ask confirmation prompt
 */
function promptConfirm(questionText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\n${C.yellow}${C.bold}${questionText} [Y/n]: ${C.reset}`, (answer) => {
      rl.close();
      const ans = (answer || 'y').toLowerCase().trim();
      resolve(ans === 'y' || ans === 'yes');
    });
  });
}

/**
 * Autonomous Coding Agent Execution
 */
async function runCodingAgent(instruction) {
  console.log(`\n${C.magenta}${C.bold}⚡ hmhslocal Autonomous Coding Agent${C.reset}`);
  console.log(`${C.dim}Instruction:${C.reset} "${instruction}"\n`);

  const result = await agent.executeTask(
    {
      prompt: instruction,
      runVerification: true,
    },
    {
      onStatus: (msg) => console.log(`${C.cyan}❯ ${msg}${C.reset}`),
      onPlan: (plan) => {
        console.log(`\n${C.bold}Implementation Plan:${C.reset}\n${plan}\n`);
      },
      onFileDiff: (file, diff, action) => {
        console.log(`\n${C.yellow}${C.bold}Proposed Change (${action}):${C.reset} ${C.cyan}${file}${C.reset}`);
        console.log('─'.repeat(70));
        diff.split('\n').forEach((line) => {
          if (line.startsWith('+')) console.log(`${C.green}${line}${C.reset}`);
          else if (line.startsWith('-')) console.log(`${C.red}${line}${C.reset}`);
          else console.log(`${C.dim}${line}${C.reset}`);
        });
        console.log('─'.repeat(70));
      },
      confirmAction: async (desc) => {
        return promptConfirm(desc);
      },
      onRepairAttempt: (attempt, max, err) => {
        console.log(`\n${C.yellow}⚠ Verification error detected. Self-repair attempt ${attempt}/${max}...${C.reset}`);
        console.log(`${C.dim}${err.slice(0, 200)}...${C.reset}`);
      },
    }
  );

  console.log(`\n${result.success ? C.green + '✔ Task Complete' : C.red + '✖ Task Incomplete'}: ${result.summary}${C.reset}\n`);
}

/**
 * Chat / Reasoning Execution with Streaming
 */
async function runChatStream(promptText) {
  process.stdout.write(`\n${C.cyan}${C.bold}[${config.defaultModel}]:${C.reset} `);

  try {
    const res = await provider.chatStream(
      config.defaultModel,
      [
        {
          role: 'system',
          content: 'You are hmhslocal, a helpful, precise terminal AI assistant. Be concise, accurate, and output clean markdown for code.',
        },
        { role: 'user', content: promptText },
      ],
      (chunk) => {
        process.stdout.write(chunk);
      }
    );

    console.log(`\n\n${C.gray}[${res.isLocal ? 'Local Private Engine' : 'Remote Provider'} · ${res.durationMs}ms]${C.reset}\n`);
  } catch (err) {
    console.log(`\n\n${C.red}Error:${C.reset} ${err.message}\n`);
    if (provider.id === 'ollama') {
      console.log(`${C.dim}Tip: Run "hmhslocal doctor" to check if Ollama is running.${C.reset}\n`);
    }
  }
}

/**
 * Models Listing & Pulling
 */
async function handleModelsCommand(actionArg, modelArg) {
  if (actionArg === 'pull' || userQuery.toLowerCase().startsWith('pull')) {
    const targetModel = modelArg || args[1] || 'llama3.2';
    console.log(`\n${C.cyan}Pulling model [${targetModel}] via Ollama HTTP API...${C.reset}`);

    const confirmed = await promptConfirm(`Download weights for ${targetModel}?`);
    if (!confirmed) {
      console.log(`${C.gray}Download cancelled.${C.reset}\n`);
      return;
    }

    try {
      await ollama.pullModel(targetModel, (status, completed, total) => {
        if (total && completed) {
          const pct = Math.round((completed / total) * 100);
          const mbDone = (completed / 1024 / 1024).toFixed(1);
          const mbTotal = (total / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r${C.dim}${status}: ${pct}% (${mbDone}/${mbTotal} MB)${C.reset}   `);
        } else {
          process.stdout.write(`\r${C.dim}${status}...${C.reset}   `);
        }
      });
      console.log(`\n${C.green}✔ Model ${targetModel} installed successfully!${C.reset}\n`);
    } catch (err) {
      console.log(`\n${C.red}Failed to pull model:${C.reset} ${err.message}\n`);
      console.log(`${C.dim}Make sure Ollama is running (ollama serve).${C.reset}\n`);
    }
    return;
  }

  // List locally installed models
  console.log(`\n${C.bold}LOCAL OLLAMA INSTALLED MODELS (${config.ollamaUrl}):${C.reset}\n`);
  try {
    const models = await ollama.listModels();
    if (models.length === 0) {
      console.log(`  ${C.yellow}No local models installed yet.${C.reset}`);
      console.log(`  ${C.dim}Download one with: hmhslocal pull llama3.2${C.reset}\n`);
    } else {
      models.forEach((m) => {
        const sizeGb = (m.size / 1024 / 1024 / 1024).toFixed(2);
        console.log(`  ${C.green}● ${m.name.padEnd(28)}${C.reset} ${C.gray}${sizeGb} GB${C.reset}`);
      });
      console.log();
    }
  } catch (err) {
    console.log(`  ${C.red}Ollama is unreachable at ${config.ollamaUrl}:${C.reset} ${err.message}`);
    console.log(`  ${C.dim}Start Ollama with: ollama serve${C.reset}\n`);
  }

  // Popular curated catalog
  console.log(`${C.bold}CURATED 1,000+ COMPATIBLE MODELS CATALOG (Highlights):${C.reset}`);
  console.log('─'.repeat(75));
  const popular = [
    { name: 'llama3.3:8b', fam: 'Llama 3.3', size: '4.7 GB', use: 'Fast General Instruction (Default)' },
    { name: 'deepseek-r1:8b', fam: 'DeepSeek-R1', size: '4.9 GB', use: 'Chain-of-thought Reasoning & Math' },
    { name: 'qwen2.5-coder:7b', fam: 'Qwen 2.5 Coder', size: '4.4 GB', use: 'Terminal Scripting & Code Completion' },
    { name: 'mistral-nemo:12b', fam: 'Mistral AI', size: '6.8 GB', use: 'High Reasoning & Multilingual' },
    { name: 'phi-4:14b', fam: 'Microsoft Phi', size: '8.9 GB', use: 'Complex Logic & Synthetic Reasoning' },
    { name: 'gemma-2:9b', fam: 'Google Gemma', size: '5.4 GB', use: 'High-performance Open Weights' },
  ];
  popular.forEach((p) => {
    console.log(`  ${C.cyan}${p.name.padEnd(20)}${C.reset} ${p.fam.padEnd(16)} ${p.size.padEnd(10)} ${p.use}`);
  });
  console.log(`\n${C.dim}To download any model, run: hmhslocal pull <model-name>${C.reset}\n`);
}

/**
 * Natural language intent dispatcher
 */
async function handleNaturalLanguageInput(promptText, onDone) {
  const p = promptText.trim().toLowerCase();
  if (!p) {
    if (onDone) onDone();
    return;
  }

  if (['exit', 'quit', 'bye', 'close', 'khatam'].includes(p)) {
    console.log(`\n${C.dim}Goodbye! hmhslocal session closed.${C.reset}\n`);
    process.exit(0);
  }

  if (['clear', 'cls', 'clean'].includes(p)) {
    process.stdout.write('\x1b[2J\x1b[0f');
    printBanner();
    if (onDone) onDone();
    return;
  }

  if (p === 'doctor' || p.includes('system health') || p.includes('check system') || p.includes('diagnostics')) {
    await runDoctorCommand();
    if (onDone) onDone();
    return;
  }

  if (p === 'models' || p === 'model list' || p.includes('show models') || p.includes('list models')) {
    await handleModelsCommand();
    if (onDone) onDone();
    return;
  }

  if (p.startsWith('pull ') || p.startsWith('download ')) {
    const target = promptText.replace(/^(pull|download)\s+/i, '').trim();
    await handleModelsCommand('pull', target);
    if (onDone) onDone();
    return;
  }

  // File creation, coding, editing intent
  if (
    p.includes('create') ||
    p.includes('write') ||
    p.includes('build') ||
    p.includes('make a') ||
    p.includes('code') ||
    p.includes('fix') ||
    p.includes('refactor') ||
    p.includes('test') ||
    p.includes('script')
  ) {
    await runCodingAgent(promptText);
    if (onDone) onDone();
    return;
  }

  // Directory inspection intent
  if (p.includes('show files') || p.includes('list files') || p === 'ls' || p === 'dir') {
    const files = workspace.findFiles({ maxResults: 30 });
    console.log(`\n${C.cyan}${C.bold}Workspace Files (${workspace.getRoot()}):${C.reset}\n`);
    files.forEach((f) => console.log(`  📄 ${f}`));
    console.log();
    if (onDone) onDone();
    return;
  }

  // Default to streaming conversational reasoning
  await runChatStream(promptText);
  if (onDone) onDone();
}

/**
 * Main Entry Point
 */
async function main() {
  const firstArg = (args[0] || '').toLowerCase();

  if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
    printBanner();
    printHelp();
    process.exit(0);
  }

  if (firstArg === 'doctor') {
    printBanner();
    await runDoctorCommand();
    process.exit(0);
  }

  if (firstArg === 'models') {
    printBanner();
    await handleModelsCommand();
    process.exit(0);
  }

  if (firstArg === 'pull') {
    printBanner();
    await handleModelsCommand('pull', args[1]);
    process.exit(0);
  }

  if (firstArg === 'code') {
    printBanner();
    const task = args.slice(1).join(' ').trim();
    if (!task) {
      console.log(`${C.yellow}Please provide a coding prompt: hmhslocal code "create user auth"${C.reset}\n`);
      process.exit(1);
    }
    await runCodingAgent(task);
    process.exit(0);
  }

  if (firstArg === 'chat' || firstArg === 'ask') {
    printBanner();
    const query = args.slice(1).join(' ').trim();
    if (query) {
      await runChatStream(query);
      process.exit(0);
    }
  }

  if (firstArg === 'config') {
    printBanner();
    const key = args[1];
    const val = args[2];
    if (key && val) {
      const updated = saveConfig({ [key]: val });
      console.log(`${C.green}✔ Updated config: ${key} = ${val}${C.reset}\n`);
    } else {
      console.log(`${C.bold}Current Configuration (.hmhslocalrc):${C.reset}`);
      console.log(JSON.stringify(config, null, 2));
      console.log();
    }
    process.exit(0);
  }

  // If user provided a query directly: e.g. `hmhslocal create a counter component`
  if (userQuery && userQuery !== 'dashboard' && userQuery !== 'repl') {
    printBanner();
    await handleNaturalLanguageInput(userQuery);
    process.exit(0);
  }

  // Interactive REPL session
  printBanner();
  console.log(`${C.green}● Interactive Terminal Agent Ready [${config.defaultModel}]${C.reset}`);
  console.log(`${C.dim}Type any instruction in plain English or "help" for commands, "exit" to quit.${C.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.cyan}${C.bold}hmhslocal❯ ${C.reset}`,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    await handleNaturalLanguageInput(line, () => rl.prompt());
  });
}

main().catch((err) => {
  console.error(`${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
