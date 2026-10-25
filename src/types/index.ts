export interface LocalModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
  loaded: boolean;
  vram_mb: number;
  description: string;
}

export interface SystemStats {
  engine: string;
  version: string;
  acceleration: string;
  device: string;
  total_ram_gb: number;
  used_ram_gb: number;
  total_vram_gb: number;
  allocated_vram_gb: number;
  cpu_usage_pct: number;
  inference_tok_s: number;
  active_models: string[];
  daemon_listening_port: number;
  api_ready: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  tok_s?: number;
  eval_duration_ms?: number;
}

export interface AgentStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  thought?: string;
  tool?: string;
  toolInput?: any;
  toolOutput?: any;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface ModelfileConfig {
  name: string;
  baseModel: string;
  temperature: number;
  topP: number;
  topK: number;
  numCtx: number;
  stopTokens: string[];
  systemPrompt: string;
}
