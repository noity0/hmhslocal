# OllamaNode & Codex: Terminal AI Agent & TUI Dashboard

<p align="center">
  <b>A private local AI agent and autonomous coding engine running DIRECTLY in your terminal.</b><br/>
  Cross-platform support for <b>Windows 11 (cmd.exe / PowerShell)</b>, <b>Apple macOS</b>, and <b>Linux</b>.
</p>

---

## ⚡ Quickstart: Run Directly in Terminal (No Browser Required!)

You do not need to open a browser at `http://localhost:3000`. The entire dashboard, chat, autonomous coding agent, and model manager run **directly inside your terminal console**.

### 1. Installation on Windows 11 (`cmd.exe` or PowerShell)

Open Command Prompt (`cmd.exe`) or Windows Terminal:

```cmd
:: Clone the repository
git clone https://github.com/noity0/hmhslocal.git
cd hmhslocal

:: Install dependencies
npm install

:: Link CLI globally
npm link
```

### 2. Installation on Apple macOS & Linux

Open your terminal (`zsh`, `bash`):

```bash
git clone https://github.com/your-username/localai-engine.git
cd localai-engine
npm install
npm link
```

---

## 🖥️ Running the Terminal Dashboard (TUI)

Simply type `codex` or `localai` in any terminal window (Windows 11 `cmd.exe`, PowerShell, macOS Terminal, or Linux):

```cmd
codex
```

This immediately launches the **ASCII Terminal Dashboard**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TERMINAL DASHBOARD                                                      │
│ OS: Windows 11 (cmd.exe)       Hardware: 16 Cores · 32.0 GB RAM          │
├─────────────────────────────────────┬────────────────────────────────────┤
│ Active Model: llama3.3:8b (Q4_K_M)  │ VRAM Alloc: 4.72 GB / 16.0 GB      │
│ Local Engine: 100% Private Airgap   │ API Daemon: http://127.0.0.1:11434 │
└─────────────────────────────────────┴────────────────────────────────────┘

SELECT AN ACTION:
  [1] 💬 Interactive Chat / REPL (Direct streaming conversation in terminal)
  [2] ⚡ Codex Autonomous Coding Agent (Inspects workspace, creates diffs & edits files)
  [3] 🔍 Natural Language to CMD / Bash (Converts English into safe Windows CMD / Bash)
  [4] 📦 Model Registry & Puller (List and download models: llama3.3, deepseek-r1)
  [5] 💻 Connect with CMD / Shell Bridge (Run dir, ipconfig, git, npm directly inside AI)
  [6] 📊 Live VRAM & Hardware Monitor (Real-time telemetry monitor in terminal)
  [7] 🚪 Exit Terminal Dashboard
```

---

## 💻 Direct Terminal Commands Reference

| Command | Windows 11 (`cmd.exe`) | Apple macOS / Linux | Description |
| :--- | :--- | :--- | :--- |
| **Terminal Dashboard** | `codex` or `localai` | `codex` or `localai` | Interactive full-screen terminal TUI dashboard |
| **Autonomous Coding Agent** | `codex code "<task>"` | `codex code "<task>"` | Inspects files, plans code, displays color diffs, writes to disk |
| **CMD / Shell Bridge** | `codex cmd` | `codex cmd` | Connects directly with `cmd.exe` or `bash` inside AI session |
| **Natural Language to CMD** | `codex shell "<prompt>"` | `codex shell "<prompt>"` | Translates plain English into Windows CMD commands or Bash |
| **Fast One-Shot Answer** | `codex ask "<prompt>"` | `codex ask "<prompt>"` | Instant answer streaming with tokens/sec speed |
| **List Models** | `codex list` | `codex list` | Shows downloaded GGUF models in memory and disk |
| **Download Model** | `codex pull deepseek-r1:8b` | `codex pull deepseek-r1:8b` | Pulls weights with ASCII progress bar |
| **Hardware Monitor** | `codex monitor` | `codex monitor` | Live VRAM and CPU usage monitor in terminal |

---

## ⚡ Examples for Windows 11 Command Prompt (`cmd.exe`)

```cmd
:: 1. Launch Autonomous Coding Agent
codex code "Create a rate-limited Express server in server.ts"

:: 2. Natural Language to Windows CMD command helper
codex shell "find all log files larger than 10MB in C drive"
:: => Generates: dir /s /b *.log and asks to run

:: 3. Interactive CMD Bridge
codex cmd
CMD> dir
CMD> ipconfig /all
CMD> ? explain which network adapter is connected to the internet
CMD> exit
```

---

## 🛡️ License

MIT License. 100% private and airgapped on your own hardware.
