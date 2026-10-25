# Ollama source inside HMHSLocal

The official Ollama source is fetched into this directory on the developer's machine by:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-ollama.ps1
```

Upstream source: https://github.com/ollama/ollama

## Important distinction

- This repository stores the setup script and this guide.
- Running the script clones the full upstream source into `vendor/ollama` locally.
- The Ollama source checkout is a separate Git repository; it is not copied into the HMHSLocal Git history.
- Source code is not a prebuilt Windows installer, a running Ollama server, or model weights.
- On Windows, building from source requires the toolchain and dependencies documented by Ollama upstream. See https://github.com/ollama/ollama/blob/main/docs/development.md.
- Do not commit model weights or downloaded installers into Git; they are large generated/binary files.

After fetching, inspect the upstream instructions before attempting a build.
