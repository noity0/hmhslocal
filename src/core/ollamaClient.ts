/**
 * Real Ollama HTTP API Client for hmhslocal
 * Communicates with local Ollama daemon (default: http://127.0.0.1:11434).
 * Supports healthchecks, model discovery, streaming chat/generate, cancellation, and pull.
 */

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStatus {
  reachable: boolean;
  version?: string;
  url: string;
  models: OllamaModelInfo[];
  error?: string;
  hint?: string;
}

export class OllamaClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl = 'http://127.0.0.1:11434', timeoutMs = 60000) {
    // Normalize URL: remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Healthcheck: Tests if Ollama is running and lists models
   */
  public async checkHealth(): Promise<OllamaStatus> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const versionRes = await fetch(`${this.baseUrl}/api/version`, {
        signal: controller.signal,
      });

      if (!versionRes.ok) {
        throw new Error(`HTTP ${versionRes.status}: ${versionRes.statusText}`);
      }

      const versionData = await versionRes.json();
      const tags = await this.listModels(controller.signal);

      clearTimeout(timer);
      return {
        reachable: true,
        version: versionData.version || 'unknown',
        url: this.baseUrl,
        models: tags,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Connection timed out (no response in 4s)' : (err.message || String(err));

      return {
        reachable: false,
        url: this.baseUrl,
        models: [],
        error: msg,
        hint: `Ollama is not running at ${this.baseUrl}.
To start Ollama:
  1. Open a new terminal and run: ollama serve
  2. If not installed, download from: https://ollama.com/download`,
      };
    }
  }

  /**
   * Lists locally installed models in Ollama
   */
  public async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal });
      if (!res.ok) {
        throw new Error(`Failed to list models: HTTP ${res.status}`);
      }
      const data = await res.json();
      return (data.models as OllamaModelInfo[]) || [];
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      throw new Error(`Ollama listModels error: ${err.message}`);
    }
  }

  /**
   * Streaming Chat completions
   */
  public async chatStream(
    model: string,
    messages: OllamaChatMessage[],
    onChunk: (content: string, chunk: OllamaChatChunk) => void,
    options?: {
      temperature?: number;
      num_ctx?: number;
      signal?: AbortSignal;
    }
  ): Promise<{ fullText: string; totalDurationMs: number; evalCount: number }> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.2,
          num_ctx: options?.num_ctx ?? 8192,
        },
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama chat failed (HTTP ${res.status}): ${errBody || res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('Response body stream is not available');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let totalDurationMs = 0;
    let evalCount = 0;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk: OllamaChatChunk = JSON.parse(line);
          const chunkContent = chunk.message?.content || '';
          if (chunkContent) {
            fullText += chunkContent;
            onChunk(chunkContent, chunk);
          }
          if (chunk.done) {
            totalDurationMs = Math.round((chunk.total_duration || 0) / 1000000);
            evalCount = chunk.eval_count || 0;
          }
        } catch {
          // ignore partial json line
        }
      }
    }

    return { fullText, totalDurationMs, evalCount };
  }

  /**
   * Streaming Text generation
   */
  public async generateStream(
    model: string,
    prompt: string,
    onChunk: (text: string, raw: any) => void,
    options?: {
      system?: string;
      temperature?: number;
      num_ctx?: number;
      signal?: AbortSignal;
    }
  ): Promise<{ fullText: string; totalDurationMs: number }> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: options?.system,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.2,
          num_ctx: options?.num_ctx ?? 8192,
        },
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama generate failed (HTTP ${res.status}): ${errBody || res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Response body stream is not available');

    const decoder = new TextDecoder();
    let fullText = '';
    let totalDurationMs = 0;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          const responseText = chunk.response || '';
          if (responseText) {
            fullText += responseText;
            onChunk(responseText, chunk);
          }
          if (chunk.done) {
            totalDurationMs = Math.round((chunk.total_duration || 0) / 1000000);
          }
        } catch {
          // ignore partial json line
        }
      }
    }

    return { fullText, totalDurationMs };
  }

  /**
   * Lists currently running/loaded models in Ollama via /api/ps
   */
  public async listRunning(signal?: AbortSignal): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models as any[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Inspects detailed information about a model via /api/show
   */
  public async showModel(modelName: string, signal?: AbortSignal): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Failed to show model ${modelName} (HTTP ${res.status}): ${err}`);
    }
    return res.json();
  }

  /**
   * Pre-loads a model into memory
   */
  public async loadModel(modelName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, prompt: '', keep_alive: -1 }),
    });
    return res.ok;
  }

  /**
   * Unloads a model from memory
   */
  public async unloadModel(modelName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, keep_alive: 0 }),
    });
    return res.ok;
  }

  /**
   * Deletes a model from Ollama storage via DELETE /api/delete
   */
  public async deleteModel(modelName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Failed to delete model ${modelName} (HTTP ${res.status}): ${err}`);
    }
    return true;
  }

  /**
   * Pulls a model from Ollama registry with progress callback
   */
  public async pullModel(
    modelName: string,
    onProgress: (status: string, completed?: number, total?: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to pull model ${modelName} (HTTP ${res.status}): ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Readable stream not available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          onProgress(data.status || 'downloading', data.completed, data.total);
        } catch {
          // ignore
        }
      }
    }
  }
}
