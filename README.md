# hmhslocal — Production Local AI Agent & Autonomous Terminal Assistant

<p align="center">
  <b>A production-grade, local-first autonomous AI coding agent running directly inside your terminal.</b><br/>
  Compatible with <b>Windows 11 (cmd.exe & PowerShell)</b>, <b>Apple macOS</b>, and <b>Linux</b>.<br/>
  Repository: <a href="https://github.com/noity0/hmhslocal">https://github.com/noity0/hmhslocal</a>
</p>

---

## 🚀 Key Highlights

- **Real Local AI via Ollama:** Integrates directly with your local Ollama HTTP API daemon (`http://127.0.0.1:11434`). Streaming tokens, health checks, model pulling with progress indicators, and cancellation.
- **Honest Execution Architecture:** Never claims a remote model is local. Local Ollama is 100% private and airgapped; remote cloud adapters (e.g., Google AI Studio Gemini) are clearly labeled.
- **Autonomous Coding Agent:** Formulates structured plans, inspects workspace directories, creates line-by-line unified diffs, asks for user confirmation, writes files safely, and performs bounded self-repair (up to 3 automated recovery iterations).
- **Strict Sandbox Security:** Path traversal protection prevents unauthorized writes outside the designated workspace root.
- **Native Windows 11 Compatibility:** Specifically engineered to handle paths with spaces (e.g. `D:\local ai\hmhslocal`), quoted batch wrappers, and native CMD/PowerShell execution.
- **1,000+ Curated Working Models:** Quick access and pull support for `llama3.3`, `deepseek-r1`, `qwen2.5-coder`, `mistral-nemo`, `phi-4`, `gemma-2`, and more.
- **Natural Language & CLI Dual Mode:** Chat in plain English or casual words, or use explicit commands (`doctor`, `code`, `chat`, `models`, `config`).
- **Comprehensive Automated Test Suite:** Verified using native Node.js test runner (`npm test`) with 100% passing tests.

---

## 📥 Installation Guide

### 1. Windows 11 Installation (Command Prompt or PowerShell)

When cloning into folders with spaces (such as `D:\local ai\hmhslocal`):

```cmd
:: Navigate to your chosen drive
D:
mkdir "D:\local ai"
cd "D:\local ai"

:: Clone the repository
git clone https://github.com/noity0/hmhslocal.git
cd hmhslocal

:: Install dependencies (the included .npmrc automatically handles Vite 8 peer dependencies)
npm install

:: Link the CLI globally
npm link
```

> **Note on ERESOLVE:** `hmhslocal` includes an optimized `.npmrc` (`legacy-peer-deps=true`) and aligned dependencies, preventing `npm error ERESOLVE` conflicts with `esbuild` and `vite@8`.

### 2. Apple macOS & Linux Installation

```bash
git clone https://github.com/noity0/hmhslocal.git
cd hmhslocal
npm install
npm link
```

---

## ⚡ Starting the Engine

### Start Ollama (Local Daemon)
Make sure Ollama is installed and running on your machine:

```bash
# In a terminal window:
ollama serve
```

If you don't have Ollama installed, download it from [https://ollama.com/download](https://ollama.com/download).

### Run Environment Diagnostics
Verify your local setup with one simple command:

```bash
hmhslocal doctor
```

Output:
```text
✔ PASS Node.js Runtime: v22.x (Supported, >= v18 required)
✔ PASS Path Spaces Safety: Handled with quoted paths
✔ PASS Workspace Write Permissions: Confirmed
✔ PASS Git Version Control: git version detected
✔ PASS Local Ollama Daemon: Connected at http://127.0.0.1:11434 (llama3.2 installed)
✔ PASS Agent Configuration: Provider: ollama · Model: llama3.2:latest
```

---

## 🛠️ CLI Usage & Command Reference

You can use explicit CLI commands or simply type instructions in natural language.

### Core CLI Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `hmhslocal doctor` | System health check | Checks Node version, Ollama daemon, path spaces, Git status |
| `hmhslocal chat [prompt]` | Streaming conversation | Real-time streaming conversation with the active model |
| `hmhslocal code <prompt>` | Autonomous coding agent | Plans, inspects codebase, shows unified diffs, writes files, runs self-repair |
| `hmhslocal ask <question>` | Codebase explanation | Fast explanation of files, functions, or architectural patterns |
| `hmhslocal models` | List models | Shows installed Ollama models and curated 1,000+ catalog |
| `hmhslocal pull <model>` | Download weights | Pulls model weights via Ollama HTTP API with progress bar |
| `hmhslocal config [key] [val]` | Settings manager | Reads or modifies `.hmhslocalrc` configuration |
| `hmhslocal` | Interactive REPL | Starts full-screen interactive natural language session |

### Natural Language Examples

You don't need to remember fixed commands. Just talk to `hmhslocal` directly:

```bash
# Autonomous coding
hmhslocal "create a rest api in express with user authentication"
hmhslocal "fix syntax errors in server.ts"
hmhslocal "write unit tests for the workspace manager"

# System operations
hmhslocal "what files are in this folder"
hmhslocal "pull deepseek-r1"
hmhslocal "check system diagnostics"
```

---

## ⚙️ Configuration (`.hmhslocalrc`)

`hmhslocal` looks for `.hmhslocalrc` in the current working directory, then in the user home directory (`~/.hmhslocalrc`).

```json
{
  "ollamaUrl": "http://127.0.0.1:11434",
  "defaultModel": "llama3.2:latest",
  "temperature": 0.2,
  "contextSize": 8192,
  "autoApproveSafeCommands": false,
  "maxSelfRepairAttempts": 3,
  "workspaceRoot": "./",
  "provider": "ollama",
  "githubRepo": "noity0/hmhslocal"
}
```

### Environment Variable Overrides
- `OLLAMA_HOST` or `HMHSLOCAL_OLLAMA_URL`: Overrides the Ollama server URL (e.g. `http://192.168.1.50:11434`).
- `HMHSLOCAL_MODEL`: Sets the default model (e.g. `qwen2.5-coder:7b`).
- `HMHSLOCAL_PROVIDER`: `ollama` (default, local) | `gemini` (remote cloud) | `mock` (testing).
- `GEMINI_API_KEY`: Required only if using the optional remote Gemini adapter.

---

## 🧪 Automated Testing & CI

Run the automated test suite locally:

```bash
npm test
```

All 20 test cases run across:
- `tests/config.test.ts`: Configuration loading, validation, env overrides.
- `tests/workspace.test.ts`: Sandbox path traversal protection, file CRUD, patching, command execution.
- `tests/ollamaClient.test.ts`: URL normalization, offline error handling, setup remediation hints.
- `tests/provider.test.ts`: Honesty check (Ollama local: true vs Gemini local: false), streaming mock engine.
- `tests/agent.test.ts`: End-to-end multi-step coding agent loop with diff verification.
- `tests/doctor.test.ts`: Comprehensive environment diagnostic validation.

Type checking and linting:

```bash
npm run lint
```

GitHub Actions CI automatically tests pull requests and commits on Ubuntu, Windows, and macOS.

---

## 🔒 Security Architecture

1. **Sandbox Path Isolation:** Every file operation passes through `WorkspaceManager.resolveSafePath()`. Traversal sequences (`../`, `../../etc`, `C:\Windows`) are intercepted and raise a `WorkspaceSecurityError`.
2. **Explicit User Confirmation:** By default, file writes and terminal commands require user confirmation (`[Y/n]`) before execution.
3. **No Secret Telemetry:** No user prompts, code snippets, or system logs are ever transmitted to third parties when running under Ollama.

---

## 📄 License

Apache-2.0 License. See [LICENSE](LICENSE) for details.
