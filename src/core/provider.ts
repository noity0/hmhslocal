/**
 * AI Provider Abstraction Layer for hmhslocal
 * Enforces honesty about local vs remote execution.
 * Ollama is local; Gemini is remote cloud adapter; Mock is deterministic for testing.
 */

import { OllamaClient } from './ollamaClient.ts';
import type { OllamaChatMessage } from './ollamaClient.ts';
import type { HmhslocalConfig } from './config.ts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderResponse {
  text: string;
  model: string;
  isLocal: boolean;
  durationMs: number;
  provider: string;
}

export interface AIProvider {
  id: 'ollama' | 'gemini' | 'mock';
  name: string;
  isLocal: boolean;
  checkAvailability(): Promise<{ available: boolean; message: string; models?: string[]; hint?: string }>;
  chatStream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { signal?: AbortSignal; temperature?: number }
  ): Promise<ProviderResponse>;
}

/**
 * Real Local Ollama Provider
 */
export class OllamaProvider implements AIProvider {
  public id: 'ollama' = 'ollama';
  public name = 'Ollama (Local Private Engine)';
  public isLocal = true;
  private client: OllamaClient;

  constructor(baseUrl?: string) {
    this.client = new OllamaClient(baseUrl);
  }

  public getClient(): OllamaClient {
    return this.client;
  }

  public async checkAvailability(): Promise<{
    available: boolean;
    message: string;
    models?: string[];
    hint?: string;
  }> {
    const health = await this.client.checkHealth();
    if (health.reachable) {
      const modelNames = health.models.map((m) => m.name);
      return {
        available: true,
        message: `Ollama v${health.version} connected at ${health.url} (${modelNames.length} local models available)`,
        models: modelNames,
      };
    }
    return {
      available: false,
      message: health.error || 'Ollama daemon unreachable',
      hint: health.hint,
      models: [],
    };
  }

  public async chatStream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { signal?: AbortSignal; temperature?: number }
  ): Promise<ProviderResponse> {
    const start = Date.now();
    const ollamaMessages: OllamaChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await this.client.chatStream(
      model,
      ollamaMessages,
      (content) => onChunk(content),
      {
        signal: options?.signal,
        temperature: options?.temperature,
      }
    );

    return {
      text: result.fullText,
      model,
      isLocal: true,
      durationMs: Date.now() - start,
      provider: 'ollama',
    };
  }
}

/**
 * Remote Gemini Provider (Cloud API Adapter)
 * Explicitly marks isLocal = false. Never claims local execution.
 */
export class GeminiProvider implements AIProvider {
  public id: 'gemini' = 'gemini';
  public name = 'Google AI Studio Gemini (Remote Cloud API)';
  public isLocal = false; // HONEST: Never claims local execution

  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  public async checkAvailability(): Promise<{
    available: boolean;
    message: string;
    models?: string[];
    hint?: string;
  }> {
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      return {
        available: false,
        message: 'GEMINI_API_KEY is not configured',
        hint: 'Set GEMINI_API_KEY in your environment or use local Ollama.',
      };
    }
    return {
      available: true,
      message: 'Gemini Cloud API Adapter active (Remote Google AI Studio)',
      models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
    };
  }

  public async chatStream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { signal?: AbortSignal; temperature?: number }
  ): Promise<ProviderResponse> {
    const start = Date.now();
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for GeminiProvider.');
    }

    // Dynamic import of @google/genai to avoid hard dependencies if unused
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const targetModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
    const stream = await ai.models.generateContentStream({
      model: targetModel,
      contents,
      config: {
        temperature: options?.temperature ?? 0.2,
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (options?.signal?.aborted) {
        throw new Error('Operation aborted by user');
      }
      const text = chunk.text || '';
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return {
      text: fullText,
      model: targetModel,
      isLocal: false,
      durationMs: Date.now() - start,
      provider: 'gemini',
    };
  }
}

/**
 * Deterministic Mock Provider for offline testing and continuous integration
 */
export class MockProvider implements AIProvider {
  public id: 'mock' = 'mock';
  public name = 'Mock Provider (Test Engine)';
  public isLocal = true;

  private cannedResponses: Map<string, string> = new Map();

  public setResponse(pattern: string, response: string) {
    this.cannedResponses.set(pattern, response);
  }

  public async checkAvailability(): Promise<{
    available: boolean;
    message: string;
    models?: string[];
  }> {
    return {
      available: true,
      message: 'Mock Provider (In-memory testing engine)',
      models: ['mock-llama-3', 'mock-coder'],
    };
  }

  public async chatStream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    const start = Date.now();
    const allText = messages.map((m) => m.content).join(' ');

    let text = `[Mock Response for model ${model}]: I have analyzed your request.`;
    for (const [pattern, resp] of this.cannedResponses) {
      if (allText.toLowerCase().includes(pattern.toLowerCase())) {
        text = resp;
        break;
      }
    }

    const words = text.split(' ');
    for (const word of words) {
      if (options?.signal?.aborted) {
        throw new Error('Operation aborted');
      }
      onChunk(word + ' ');
      await new Promise((r) => setTimeout(r, 10));
    }

    return {
      text,
      model,
      isLocal: true,
      durationMs: Date.now() - start,
      provider: 'mock',
    };
  }
}

/**
 * Factory helper to get the active provider based on configuration
 */
export function getAIProvider(config: HmhslocalConfig): AIProvider {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider();
    case 'mock':
      return new MockProvider();
    case 'ollama':
    default:
      return new OllamaProvider(config.ollamaUrl);
  }
}
