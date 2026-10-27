# hmhslocal — Terminal-only Local AI Assistant

hmhslocal is a CLI-first AI assistant and coding agent for Windows CMD/PowerShell, macOS, and Linux. The normal startup path runs in the terminal; it does not open a browser or start a web dashboard.

## What it can do

- Chat with a local Ollama model, with streaming responses.
- Accept ordinary language such as `hi`, `show me all files in this folder`, `check network ports and IP`, and `push latest changes to GitHub`.
- List workspace files, show the current directory, check IP/network ports, and inspect Git status.
- Generate and modify project files through the coding agent, show diffs, and ask before applying changes.
- List local Ollama models, download a model, and run diagnostics.
- Keep potentially destructive or publishing actions behind confirmation and avoid automatically committing all uncommitted files.

## Windows setup

Open CMD or PowerShell:

```cmd
cd /d "D:\\local ai\\hmhslocal"
git pull --ff-only origin main
npm install
npm run dev
```

The default `npm run dev`, `npm start`, `npm run cli`, and `npm run tui` commands all start the terminal interface. Web-server startup scripts are intentionally not exposed as package scripts.

## Examples

Inside the hmhslocal prompt, type naturally:

```text
hi
show me all files in this folder
show my current directory
check network ports and IP
show git status
download deepseek-r1
create an Express API with a health endpoint
fix the bug in src/server.ts
push latest changes to GitHub
```

You can also run one-off requests from CMD/PowerShell:

```cmd
npm run dev -- "show me all files in this folder"
npm run dev -- "check network ports and IP"
npm run dev -- doctor
```

For Git publishing, hmhslocal checks the working tree first. If files are uncommitted, it will ask you to review and commit the intended files rather than automatically staging everything. A push of committed changes requires confirmation.

## Local AI setup

Install Ollama and download a model, for example:

```cmd
ollama pull llama3.2
```

Then start hmhslocal:

```cmd
npm run dev
```

The CLI talks to the Ollama service through its local API (normally `http://127.0.0.1:11434`). This is an internal local model connection, not a browser UI or hmhslocal web dashboard. Requests stay local when the configured provider is Ollama. The optional Gemini provider uses a remote cloud API and is not local-only.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start terminal REPL |
| `npm run doctor` | Check environment and Ollama |
| `npm test` | Run tests |
| `npm run lint` | Run TypeScript checks |
| `models` | List local models |
| `pull deepseek-r1` | Download a model |
| `code <task>` | Run the coding agent |
| `help` | Show CLI help |
| `exit` | Quit the REPL |

## Safety notes

- File edits are constrained to the configured workspace root.
- Coding-agent file changes are shown for review and require confirmation by default.
- Terminal commands are subject to safety checks and timeouts.
- Git push requires confirmation. Uncommitted files are not automatically committed.
- Use Ollama for local inference; do not set the provider to Gemini if you require local-only model inference.

## Tests

```cmd
npm test
npm run lint
```

## License

Apache-2.0. See [LICENSE](LICENSE).
