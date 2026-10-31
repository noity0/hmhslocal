# hmhslocal — Local-First Terminal AI Assistant & Coding Agent

[![GitHub stars](https://img.shields.io/github/stars/noity0/hmhslocal?style=flat-square)](https://github.com/noity0/hmhslocal/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/noity0/hmhslocal?style=flat-square)](https://github.com/noity0/hmhslocal/issues)
[![Last commit](https://img.shields.io/github/last-commit/noity0/hmhslocal?style=flat-square)](https://github.com/noity0/hmhslocal/commits/main)

> A terminal-only AI assistant and coding agent for Windows, macOS, and Linux, with local Ollama support and an optional cloud AI provider.

`hmhslocal` is a command-line-first developer assistant. It runs in CMD or PowerShell on Windows and in a terminal on macOS/Linux. Its normal startup path is the terminal interface; it does not launch a browser dashboard.

## What it can do

- Chat with a local Ollama model, including streaming responses.
- Inspect files and folders within the configured workspace.
- Read Git status and help prepare selected changes for publishing.
- Generate and edit project files through a coding workflow.
- Show proposed changes for review before applying them.
- List local Ollama models and run environment diagnostics.
- Handle natural-language requests for common development tasks.

Available actions depend on the configured provider, local permissions, and installed tools. Review proposed file changes and commands before approving them.

## Privacy and provider modes

**Local mode:** When configured to use Ollama, model inference is sent to the local Ollama service, normally `http://127.0.0.1:11434`.

**Cloud mode:** The optional Gemini provider sends prompts to Google's cloud API. This is not local-only processing. Review the provider's privacy terms before sending private source code or data.

## Requirements

- Node.js 22 LTS recommended
- npm
- Git
- Ollama for local model inference
- A compatible local model downloaded in Ollama

## Windows setup

Clone the project:

```powershell
git clone https://github.com/noity0/hmhslocal.git
Set-Location hmhslocal
npm install
```

Install and start Ollama separately, then download a model:

```powershell
ollama pull llama3.2
```

Make sure the Ollama service is running. The default local API endpoint is:

```text
http://127.0.0.1:11434
```

Start the terminal assistant:

```powershell
npm run dev
```

## Examples

Inside the hmhslocal prompt, try requests such as:

```text
help
show my current directory
show git status
list files in this workspace
list local models
download a model using Ollama
explain this project structure
review a proposed code change
```

You can also pass a one-off request from PowerShell:

```powershell
npm run dev -- "show git status"
npm run dev -- "list files in this workspace"
npm run doctor
```

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the terminal assistant |
| `npm start` | Start the terminal assistant |
| `npm run cli` | Start the terminal interface |
| `npm run tui` | Start the terminal interface |
| `npm run doctor` | Run environment and Ollama diagnostics |
| `npm test` | Run automated tests |
| `npm run lint` | Run TypeScript checks |

Inside the assistant, use `help` to view the commands supported by the current version.

## Git workflow and safety

The project is designed to request review/confirmation for file changes and Git publishing actions. Inspect diffs before accepting them. Do not approve commands or edits you do not understand, and keep important work backed up.

## Troubleshooting

- **Ollama is not detected:** Confirm Ollama is installed and the service is running; then run `ollama list`.
- **No model is available:** Download a compatible model with `ollama pull <model-name>`.
- **Node command not found:** Install Node.js 22 LTS and reopen the terminal.
- **Dependency errors:** Run `npm install` from the repository root.
- **Tests fail:** Run `npm test` and review the first reported error.

## Contributing

Bug reports, test cases, provider improvements, Windows compatibility fixes, and documentation updates are welcome.

- [Issues](https://github.com/noity0/hmhslocal/issues)
- [Source code](https://github.com/noity0/hmhslocal)

## License

This repository includes an Apache-2.0 license. See [LICENSE](LICENSE) for the full terms.

## Search terms

Local AI assistant, terminal AI, coding agent, Ollama, local LLM, command-line assistant, Windows PowerShell AI, developer tools, Gemini API, Node.js, TypeScript, HMHS.
