import React, { useState } from 'react';
import {
  Box,
  Download,
  Trash2,
  HardDrive,
  Cpu,
  CheckCircle2,
  RotateCw,
  Search,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { LocalModel } from '../types';

interface ModelManagerProps {
  models: LocalModel[];
  onLoadModel: (name: string) => void;
  onUnloadModel: (name: string) => void;
  onRefreshModels: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  models,
  onLoadModel,
  onUnloadModel,
  onRefreshModels,
}) => {
  const [search, setSearch] = useState('');
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    completed: number;
    total: number;
    speed: string;
  } | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const POPULAR_MODELS = [
    { name: 'llama3.3:8b', desc: 'Meta Llama 3.3 8B Instruct · 128k context', size: '4.7 GB', vram: '6 GB' },
    { name: 'deepseek-r1:8b', desc: 'DeepSeek R1 Distill · Chain-of-thought reasoning', size: '4.9 GB', vram: '6 GB' },
    { name: 'qwen2.5-coder:7b', desc: 'Alibaba Qwen 2.5 Coder · Code & Bash terminal', size: '4.4 GB', vram: '6 GB' },
    { name: 'mistral:7b', desc: 'Mistral 7B Instruct v0.3 · Fast instruction following', size: '4.1 GB', vram: '5 GB' },
    { name: 'phi-4:14b', desc: 'Microsoft Phi-4 14B · State-of-the-art synthetic reasoning', size: '8.9 GB', vram: '10 GB' },
    { name: 'gemma-2:9b', desc: 'Google Gemma 2 9B · High precision reasoning', size: '5.4 GB', vram: '7 GB' },
    { name: 'nomic-embed-text', desc: 'Nomic Embeddings · High performance text vectors', size: '274 MB', vram: '1 GB' },
  ];

  const handlePull = async (targetName?: string) => {
    const name = targetName || pullModelName;
    if (!name.trim() || isPulling) return;

    setIsPulling(true);
    setPullProgress({
      status: `Connecting to model registry for ${name}...`,
      completed: 0,
      total: 4729118208,
      speed: '38.4 MB/s',
    });

    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              setPullProgress({
                status: data.status,
                completed: data.completed || 0,
                total: data.total || 4729118208,
                speed: data.speed_mb_s ? `${data.speed_mb_s} MB/s` : '42.1 MB/s',
              });
            } catch (err) {
              // ignore
            }
          }
        }
      }
      onRefreshModels();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPulling(false);
      setPullProgress(null);
      setPullModelName('');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await fetch('/api/models/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      onRefreshModels();
    } catch (err) {
      console.error(err);
    }
  };

  const copyCommand = (name: string) => {
    navigator.clipboard.writeText(`localai run ${name}`);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Pull Input */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-400" />
              <span>Model Registry & Local Weight Manager</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pull, inspect, and manage GGUF quantized models stored in your private local filesystem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Directory: <span className="text-slate-300">~/.localai/models</span>
            </span>
          </div>
        </div>

        {/* Pull Model Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={pullModelName}
              onChange={(e) => setPullModelName(e.target.value)}
              placeholder="Enter model tag to pull (e.g. llama3.3:8b, deepseek-r1:8b, mistral:7b)..."
              disabled={isPulling}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded px-3.5 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => handlePull()}
            disabled={isPulling || !pullModelName.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded transition-colors whitespace-nowrap"
          >
            {isPulling ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Pulling Weights...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Pull Model</span>
              </>
            )}
          </button>
        </div>

        {/* Pull Progress indicator */}
        {pullProgress && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span className="text-emerald-400">{pullProgress.status}</span>
              <span>{pullProgress.speed}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((pullProgress.completed / pullProgress.total) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Popular Models Quick Pull Suggestions */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg">
        <div className="text-xs font-semibold text-slate-300 mb-3">
          Popular Local Models Available in Registry
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {POPULAR_MODELS.map((pm) => {
            const isInstalled = models.some((m) => m.name === pm.name);
            return (
              <div
                key={pm.name}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{pm.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">{pm.size}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{pm.desc}</div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Rec. {pm.vram} VRAM</span>
                  {isInstalled ? (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Installed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePull(pm.name)}
                      disabled={isPulling}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    >
                      Pull Model ❯
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Installed Models Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Installed Models ({filteredModels.length})
          </h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search local models..."
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModels.map((model) => (
            <div
              key={model.name}
              className={`p-4 bg-slate-900/50 border rounded-lg space-y-3 transition-colors ${
                model.loaded
                  ? 'border-emerald-700/80 bg-slate-900/80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{model.name}</span>
                    {model.loaded && (
                      <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                        ACTIVE IN VRAM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{model.description}</div>
                </div>

                <button
                  onClick={() => handleDelete(model.name)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Delete model from disk"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950 rounded text-[11px] font-mono border border-slate-800/60">
                <div>
                  <span className="text-slate-500 block">Quantization</span>
                  <span className="text-slate-200">{model.details.quantization_level}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Size</span>
                  <span className="text-slate-200 tabular-nums">
                    {(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Family</span>
                  <span className="text-slate-200">{model.details.family}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => copyCommand(model.name)}
                  className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copiedName === model.name ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>localai run {model.name}</span>
                </button>

                <div>
                  {model.loaded ? (
                    <button
                      onClick={() => onUnloadModel(model.name)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
                    >
                      Unload from VRAM
                    </button>
                  ) : (
                    <button
                      onClick={() => onLoadModel(model.name)}
                      className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold rounded transition-colors"
                    >
                      Load into VRAM
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
