# OllamaNode: Private Local AI Engine & Agent Studio

<p align="center">
  <b>Run private LLMs locally on your own hardware with zero data leakage.</b><br/>
  Featuring an intuitive developer dashboard, interactive terminal CLI, Ollama-compatible API, and autonomous multi-step agent runtime.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg" alt="Node" />
  <img src="https://img.shields.io/badge/API-Ollama%20Compatible-orange.svg" alt="Ollama API" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Airgapped%20Local-emerald.svg" alt="Privacy" />
</p>

---

## ⚡ Highlights

- **Private & Airgapped**: Runs 100% on your machine (GPU Metal/CUDA or CPU). Zero telemetry, zero external token logging.
- **Ollama-Compatible API**: Seamless drop-in replacement on `http://localhost:11434` for tools like Cursor, Continue.dev, LangChain, LlamaIndex, and Python `ollama` SDK.
- **Terminal CLI & REPL**: `localai run llama3.3:8b`, `localai list`, `localai pull`, `localai agent`, and `localai serve`.
- **Autonomous Local Agent Runtime**: Plan, execute shell commands, sandboxed code execution, file IO, and iterative self-correction.
- **Modelfile Studio**: Build custom specialized agents using Docker-like Modelfile instructions (`FROM`, `SYSTEM`, `PARAMETER`, `TEMPLATE`).
- **Intuitive Web Dashboard**: Real-time streaming chat, VRAM/RAM hardware gauge, latency & token speed metrics (tok/s), and parameter tuner.

---

## 📦 Quickstart

### 1. Installation via npm

```bash
# Clone the repository
git clone https://github.com/your-username/localai-engine.git
cd localai-engine

# Install dependencies
npm install

# Link CLI command globally (optional)
npm link
```

### 2. Run in Terminal

```bash
# Check installed models
localai list

# Pull a model
localai pull llama3.3:8b

# Start an interactive chat REPL
localai run llama3.3:8b

# Run an autonomous agent
localai agent "Analyze repository security and generate remediation checklist"
```

### 3. Launch Web Dashboard & API Server

```bash
npm run dev
# Dashboard opens at http://localhost:3000
# Ollama-compatible API listening at http://localhost:3000/api
```

---

## 💻 CLI Commands Reference

| Command | Description | Example |
| :--- | :--- | :--- |
| `localai run <model> [prompt]` | Run a model in an interactive terminal REPL | `localai run deepseek-r1:8b` |
| `localai list` | List all local models in registry | `localai list` |
| `localai pull <model>` | Download a model weights package | `localai pull qwen2.5-coder:7b` |
| `localai agent "<goal>"` | Execute autonomous agent task loop | `localai agent "Build REST API in Express"` |
| `localai ps` | Inspect models currently loaded in memory | `localai ps` |
| `localai serve` | Run background API daemon | `localai serve --port 11434` |
| `localai create <name> -f <file>` | Create custom model from Modelfile | `localai create my-coder -f ./Modelfile` |
| `localai rm <model>` | Delete local model weights from disk | `localai rm mistral:7b` |
| `localai ui` | Open the intuitive web dashboard | `localai ui` |

---

## 🤖 Supported Models

| Model | Parameters | Quantization | Recommended VRAM | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `llama3.3:8b` | 8 Billion | Q4_K_M (4.7 GB) | 6 GB | General reasoning, conversation, writing |
| `deepseek-r1:8b` | 8 Billion | Q4_K_M (4.9 GB) | 6 GB | Deep step-by-step reasoning & math |
| `qwen2.5-coder:7b` | 7 Billion | Q4_K_M (4.4 GB) | 6 GB | Full-stack software engineering, debugging |
| `mistral:7b` | 7.3 Billion | Q4_K_M (4.1 GB) | 5 GB | Instruction following, fast summarization |
| `phi-4:14b` | 14 Billion | Q4_K_M (8.9 GB) | 10 GB | High-precision STEM & complex reasoning |
| `gemma-2:9b` | 9.2 Billion | Q4_K_M (5.4 GB) | 7 GB | Creative writing, structured extraction |

---

## 🔌 Ollama & OpenAI Compatible API

### Generate Completion (`POST /api/generate`)

```bash
curl http://localhost:3000/api/generate -d '{
  "model": "llama3.3:8b",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

### Chat Completion (`POST /api/chat`)

```bash
curl http://localhost:3000/api/chat -d '{
  "model": "deepseek-r1:8b",
  "messages": [
    { "role": "user", "content": "Write a quicksort in TypeScript" }
  ]
}'
```

### Python SDK Integration

```python
import requests

response = requests.post(
    "http://localhost:3000/api/generate",
    json={
        "model": "llama3.3:8b",
        "prompt": "Summarize the principles of distributed systems.",
        "stream": False
    }
)

print(response.json()["response"])
```

---

## 📄 Modelfile Specification

Create custom agents using a standard Modelfile:

```dockerfile
FROM llama3.3:8b

# Inference Parameters
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER stop "<|eot_id|>"

# Custom Agent System Prompt
SYSTEM """
You are a Staff Security Engineer. Your job is to audit code for
OWASP Top 10 vulnerabilities, unauthorized file access, and memory leaks.
Always provide concrete remediation diffs.
"""
```

Build it with:
```bash
localai create security-auditor -f ./Modelfile
```

---

## 📁 Repository Structure

```
.
├── bin/
│   └── localai.js              # Executable CLI entrypoint
├── examples/
│   ├── curl_examples.sh        # API request scripts
│   ├── node_client.mjs         # Node.js SDK example
│   └── python_agent.py         # Python client example
├── src/
│   ├── agents/                 # Autonomous agent workflow engine
│   ├── cli/                    # CLI commands & terminal engine
│   ├── components/             # Intuitive web UI views
│   ├── engine/                 # Model registry & memory manager
│   ├── repo/                   # Repo file browser & ZIP bundler
│   ├── App.tsx                 # Main application dashboard
│   ├── index.css               # Global typography & styles
│   └── main.tsx                # Client entrypoint
├── Modelfile.example           # Example Modelfile template
├── server.ts                   # Express & Ollama API server
├── package.json
└── README.md
```

---

## 🛡️ License

MIT License. Free for personal, commercial, and research use.
