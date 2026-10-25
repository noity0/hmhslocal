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
  vram_mb: number | null;
  description: string;
}

export interface SystemStats {
  engine: string;
  version: string;
  acceleration: string | null;
  device: string;
  total_ram_gb: number;
  used_ram_gb: number;
  free_ram_gb?: number;
  total_vram_gb: number | null;
  allocated_vram_gb: number | null;
  cpu_usage_pct: number | null;
  inference_tok_s: number | null;
  active_models: string[];
  daemon_listening_port: number;
  api_ready: boolean;
  provider?: string;
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
