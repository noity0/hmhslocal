import express, { Request, Response } from 'express';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { EnvironmentDoctor } from './src/core/doctor.ts';
import { loadConfig, saveConfig, validateConfig } from './src/core/config.ts';
import { OllamaClient } from './src/core/ollamaClient.ts';
import { WorkspaceManager } from './src/core/workspace.ts';
import { CodingAgent } from './src/core/agent.ts';
import { getAIProvider } from './src/core/provider.ts';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// Initialize GoogleGenAI server-side with required User-Agent
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * 1. Ollama-compatible Tags endpoint
 * Queries the real Ollama daemon. If Ollama is offline, returns empty models array with offline status.
 * Never fabricates models.
 */
app.get('/api/tags', async (req: Request, res: Response) => {
  const config = loadConfig();
  const client = new OllamaClient(config.ollamaUrl);

  try {
    const health = await client.checkHealth();
    if (!health.reachable) {
      return res.json({
        models: [],
        offline: true,
        error: health.error,
        hint: health.hint,
        url: config.ollamaUrl,
      });
    }

    const [tags, running] = await Promise.all([
      client.listModels(),
      client.listRunning(),
    ]);

    const runningNames = new Set(running.map((r: any) => r.name || r.model));

    const models = tags.map((m) => ({
      name: m.name,
      model: m.name,
      modified_at: m.modified_at,
      size: m.size,
      digest: m.digest,
      details: m.details || {
        format: 'gguf',
        family: m.name.split(':')[0] || 'unknown',
        parameter_size: 'unknown',
        quantization_level: 'unknown',
      },
      loaded: runningNames.has(m.name),
      vram_mb: null,
      description: `Locally installed ${m.name} model`,
    }));

    res.json({ models, offline: false, url: config.ollamaUrl });
  } catch (err: any) {
    res.json({
      models: [],
      offline: true,
      error: err.message || 'Failed to connect to Ollama daemon',
      url: config.ollamaUrl,
    });
  }
});

/**
 * 2. Ollama version endpoint
 */
app.get('/api/version', async (req: Request, res: Response) => {
  const config = loadConfig();
  const client = new OllamaClient(config.ollamaUrl);
  const health = await client.checkHealth();
  res.json({
    reachable: health.reachable,
    version: health.version || null,
    url: config.ollamaUrl,
    error: health.error || null,
    hint: health.hint || null,
  });
});

/**
 * 3. Genuine System & Hardware Telemetry Endpoint
 * Measures actual host memory, CPU, and running models.
 * Never invents GPU models (e.g. RTX 4090) or fake VRAM.
 */
app.get('/api/system/stats', async (req: Request, res: Response) => {
  const config = loadConfig();
  const client = new OllamaClient(config.ollamaUrl);

  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'Generic CPU';
  const totalRamBytes = os.totalmem();
  const freeRamBytes = os.freemem();
  const usedRamBytes = totalRamBytes - freeRamBytes;

  let apiReady = false;
  let ollamaVersion = 'offline';
  let activeModels: string[] = [];

  try {
    const health = await client.checkHealth();
    apiReady = health.reachable;
    ollamaVersion = health.version || 'offline';
    if (apiReady) {
      const running = await client.listRunning();
      activeModels = running.map((r: any) => r.name || r.model);
    }
  } catch {
    // Daemon offline
  }

  // Parse listening port from ollamaUrl
  let port = 11434;
  try {
    const u = new URL(config.ollamaUrl);
    if (u.port) port = Number(u.port);
  } catch {
    // default
  }

  res.json({
    engine: apiReady ? `Ollama Daemon (${ollamaVersion})` : 'Ollama Daemon (Disconnected)',
    version: ollamaVersion,
    acceleration: null,
    device: `${os.type()} ${os.arch()} · ${cpuModel} (${cpus.length} cores)`,
    total_ram_gb: +(totalRamBytes / 1073741824).toFixed(2),
    used_ram_gb: +(usedRamBytes / 1073741824).toFixed(2),
    free_ram_gb: +(freeRamBytes / 1073741824).toFixed(2),
    total_vram_gb: null,
    allocated_vram_gb: null,
    cpu_usage_pct: null,
    inference_tok_s: null,
    active_models: activeModels,
    daemon_listening_port: port,
    api_ready: apiReady,
    provider: config.provider,
  });
});

/**
 * 4. Diagnostics Doctor Endpoint
 */
app.get('/api/doctor', async (req: Request, res: Response) => {
  try {
    const doc = new EnvironmentDoctor();
    const report = await doc.runDiagnostics();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Doctor failed' });
  }
});

/**
 * 5. Configuration Read/Write Endpoints
 * Sanitized, validated, defended against SSRF and prototype pollution.
 */
app.get('/api/config', (req: Request, res: Response) => {
  const cfg = loadConfig();
  // Safe sanitized configuration object (never expose any API secrets)
  res.json({
    ollamaUrl: cfg.ollamaUrl,
    defaultModel: cfg.defaultModel,
    temperature: cfg.temperature,
    contextSize: cfg.contextSize,
    autoApproveSafeCommands: cfg.autoApproveSafeCommands,
    maxSelfRepairAttempts: cfg.maxSelfRepairAttempts,
    workspaceRoot: cfg.workspaceRoot,
    provider: cfg.provider,
    githubRepo: cfg.githubRepo,
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const validated = validateConfig(req.body);
    const updated = saveConfig(validated);
    res.json({
      success: true,
      config: {
        ollamaUrl: updated.ollamaUrl,
        defaultModel: updated.defaultModel,
        temperature: updated.temperature,
        contextSize: updated.contextSize,
        autoApproveSafeCommands: updated.autoApproveSafeCommands,
        maxSelfRepairAttempts: updated.maxSelfRepairAttempts,
        workspaceRoot: updated.workspaceRoot,
        provider: updated.provider,
        githubRepo: updated.githubRepo,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Config validation failed' });
  }
});

/**
 * 6. Model Operations (load, unload, delete)
 * Dispatches to real Ollama API.
 */
app.post('/api/models/:action', async (req: Request, res: Response) => {
  const { action } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Valid model name is required' });
  }

  const modelName = name.trim();
  const config = loadConfig();
  const client = new OllamaClient(config.ollamaUrl);

  const health = await client.checkHealth();
  if (!health.reachable) {
    return res.status(503).json({
      error: `Ollama is offline at ${config.ollamaUrl}. Cannot perform ${action}.`,
      hint: health.hint,
    });
  }

  try {
    if (action === 'load') {
      const ok = await client.loadModel(modelName);
      return res.json({ success: ok, message: `Loaded ${modelName} into memory` });
    } else if (action === 'unload') {
      const ok = await client.unloadModel(modelName);
      return res.json({ success: ok, message: `Unloaded ${modelName} from memory` });
    } else if (action === 'delete') {
      const ok = await client.deleteModel(modelName);
      return res.json({ success: ok, message: `Deleted ${modelName}` });
    }
    return res.status(400).json({ error: `Invalid action "${action}". Must be load, unload, or delete.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || `Action ${action} failed` });
  }
});

/**
 * 7. Real Model Pulling Stream
 * Proxies genuine streaming download events from Ollama.
 */
app.post('/api/pull', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9_\-.:/]+$/.test(name.trim())) {
    return res.status(400).json({ error: 'Valid model name is required (e.g. "llama3.2:latest")' });
  }

  const modelName = name.trim();
  const config = loadConfig();
  const client = new OllamaClient(config.ollamaUrl);

  const health = await client.checkHealth();
  if (!health.reachable) {
    return res.status(503).json({
      error: `Ollama daemon is offline at ${config.ollamaUrl}`,
      hint: health.hint,
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    await client.pullModel(
      modelName,
      (status, completed, total) => {
        res.write(
          JSON.stringify({
            model: modelName,
            status,
            completed: completed || 0,
            total: total || 0,
          }) + '\n'
        );
      },
      controller.signal
    );

    res.write(JSON.stringify({ status: 'success', model: modelName }) + '\n');
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Pull failed' });
    } else {
      res.write(JSON.stringify({ status: 'error', error: err.message }) + '\n');
      res.end();
    }
  }
});

/**
 * 8. Real Generate Endpoint
 */
app.post('/api/generate', async (req: Request, res: Response) => {
  const { model, prompt, stream = true, system } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const config = loadConfig();
  const activeModel = model || config.defaultModel;

  // Remote Gemini adapter if configured
  if (config.provider === 'gemini' && ai && process.env.GEMINI_API_KEY) {
    try {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: system ? { systemInstruction: system } : undefined,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          res.write(
            JSON.stringify({
              model: 'gemini-2.5-flash (remote)',
              created_at: new Date().toISOString(),
              response: text,
              done: false,
            }) + '\n'
          );
        }
        res.write(JSON.stringify({ done: true, response: '' }) + '\n');
        return res.end();
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: system ? { systemInstruction: system } : undefined,
        });
        return res.json({
          model: 'gemini-2.5-flash (remote)',
          response: response.text,
          done: true,
        });
      }
    } catch (err: any) {
      return res.status(502).json({ error: `Gemini API error: ${err.message}` });
    }
  }

  // Local Ollama
  const client = new OllamaClient(config.ollamaUrl);
  const health = await client.checkHealth();
  if (!health.reachable) {
    return res.status(503).json({
      error: `Local Ollama engine is not running at ${config.ollamaUrl}`,
      hint: health.hint,
    });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await client.generateStream(
        activeModel,
        prompt,
        (text, chunk) => {
          res.write(
            JSON.stringify({
              model: activeModel,
              created_at: chunk.created_at || new Date().toISOString(),
              response: text,
              done: false,
            }) + '\n'
          );
        },
        { system, temperature: config.temperature, num_ctx: config.contextSize }
      );

      res.write(JSON.stringify({ done: true, response: '' }) + '\n');
      res.end();
    } else {
      let fullText = '';
      await client.generateStream(
        activeModel,
        prompt,
        (text) => {
          fullText += text;
        },
        { system, temperature: config.temperature, num_ctx: config.contextSize }
      );
      res.json({ model: activeModel, response: fullText, done: true });
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Generation failed' });
    } else {
      res.write(JSON.stringify({ error: err.message, done: true }) + '\n');
      res.end();
    }
  }
});

/**
 * 9. Real Chat Endpoint
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  const { model, messages = [], stream = true } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const config = loadConfig();
  const activeModel = model || config.defaultModel;

  // Remote Gemini adapter if configured
  if (config.provider === 'gemini' && ai && process.env.GEMINI_API_KEY) {
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const systemMsg = messages.find((m: any) => m.role === 'system')?.content;

    try {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: lastUserMessage,
          config: systemMsg ? { systemInstruction: systemMsg } : undefined,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          res.write(
            JSON.stringify({
              model: 'gemini-2.5-flash (remote)',
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content: text },
              done: false,
            }) + '\n'
          );
        }
        res.write(
          JSON.stringify({
            model: 'gemini-2.5-flash (remote)',
            message: { role: 'assistant', content: '' },
            done: true,
          }) + '\n'
        );
        return res.end();
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: lastUserMessage,
          config: systemMsg ? { systemInstruction: systemMsg } : undefined,
        });
        return res.json({
          model: 'gemini-2.5-flash (remote)',
          message: { role: 'assistant', content: response.text },
          done: true,
        });
      }
    } catch (err: any) {
      return res.status(502).json({ error: `Gemini API error: ${err.message}` });
    }
  }

  // Local Ollama
  const client = new OllamaClient(config.ollamaUrl);
  const health = await client.checkHealth();
  if (!health.reachable) {
    return res.status(503).json({
      error: `Local Ollama engine is not running at ${config.ollamaUrl}`,
      hint: health.hint,
    });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await client.chatStream(
        activeModel,
        messages,
        (content) => {
          res.write(
            JSON.stringify({
              model: activeModel,
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content },
              done: false,
            }) + '\n'
          );
        },
        {
          temperature: config.temperature,
          num_ctx: config.contextSize,
        }
      );

      res.write(
        JSON.stringify({
          model: activeModel,
          message: { role: 'assistant', content: '' },
          done: true,
        }) + '\n'
      );
      res.end();
    } else {
      let fullText = '';
      await client.chatStream(
        activeModel,
        messages,
        (chunk) => {
          fullText += chunk;
        },
        { temperature: config.temperature, num_ctx: config.contextSize }
      );
      res.json({
        model: activeModel,
        message: { role: 'assistant', content: fullText },
        done: true,
      });
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Chat completion failed' });
    } else {
      res.write(JSON.stringify({ error: err.message, done: true }) + '\n');
      res.end();
    }
  }
});

/**
 * 10. Real Autonomous Agent Loop
 * Connects directly to CodingAgent with WorkspaceManager sandbox and real AI provider.
 */
app.post('/api/agent/run', async (req: Request, res: Response) => {
  const { goal = '', targetFiles = [], verificationCommand = 'npm test' } = req.body;

  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Goal prompt is required' });
  }

  const config = loadConfig();
  const provider = getAIProvider(config);
  const workspace = new WorkspaceManager(config.workspaceRoot);
  const agent = new CodingAgent(workspace, provider, config);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const emit = (event: string, payload: any) => {
    res.write(`data: ${JSON.stringify({ event, ...payload })}\n\n`);
  };

  emit('agent_start', { goal, provider: provider.name, timestamp: Date.now() });

  let stepNumber = 1;

  try {
    const result = await agent.executeTask(
      {
        prompt: goal,
        targetFiles: Array.isArray(targetFiles) ? targetFiles : [],
        runVerification: true,
        verificationCommand,
      },
      {
        onStatus: (msg) => {
          emit('step_start', {
            step: stepNumber++,
            title: msg,
            description: msg,
          });
        },
        onPlan: (plan) => {
          emit('step_update', {
            step: stepNumber,
            thought: plan,
            status: 'complete',
          });
        },
        onFileDiff: (filePath, diff, action) => {
          emit('tool_call', {
            tool: 'file_edit',
            input: { filePath, action },
            output: diff,
          });
        },
        onCommandOutput: (cmdRes) => {
          emit('tool_call', {
            tool: 'command_exec',
            input: { command: cmdRes.command },
            output: cmdRes.stdout || cmdRes.stderr || `Exit code: ${cmdRes.exitCode}`,
          });
        },
        onRepairAttempt: (attempt, max, error) => {
          emit('step_update', {
            step: stepNumber,
            thought: `Self-repair attempt ${attempt}/${max}: ${error}`,
            status: 'running',
          });
        },
      }
    );

    emit('agent_finish', {
      result: result.summary || (result.success ? 'Task completed successfully.' : result.error),
      success: result.success,
      filesChanged: result.filesChanged,
      commandsRun: result.commandsRun,
      duration_ms: 0,
      status: result.success ? 'success' : 'failed',
    });
    res.end();
  } catch (err: any) {
    emit('agent_finish', {
      result: `Execution error: ${err.message}`,
      success: false,
      status: 'failed',
    });
    res.end();
  }
});

/**
 * 11. Repository Source Files API
 */
app.get('/api/repo/files', (req: Request, res: Response) => {
  try {
    const fileList = [
      'package.json',
      'README.md',
      'bin/hmhslocal.js',
      'bin/localai.js',
      'bin/hmhslocal.cmd',
      'bin/codex.cmd',
      'bin/localai.cmd',
      '.env.example',
      'vite.config.ts',
      'tsconfig.json',
      'server.ts',
      'src/core/config.ts',
      'src/core/ollamaClient.ts',
      'src/core/provider.ts',
      'src/core/workspace.ts',
      'src/core/agent.ts',
      'src/core/doctor.ts',
      'src/App.tsx',
    ];

    const contents: Record<string, string> = {};
    for (const f of fileList) {
      const fullPath = path.join(__dirname, f);
      if (fs.existsSync(fullPath)) {
        contents[f] = fs.readFileSync(fullPath, 'utf-8');
      }
    }

    res.json({ files: contents });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to read repo files' });
  }
});

// Vite or Static Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode: Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  hmhslocal Production AI Server & Dashboard Started!`);
    console.log(`  • Web Dashboard: http://localhost:${PORT}`);
    console.log(`  • Ollama Compatible API: http://localhost:${PORT}/api`);
    console.log(`======================================================\n`);
  });
}

startServer();
