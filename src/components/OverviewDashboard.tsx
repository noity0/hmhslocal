import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Terminal,
  Bot,
  Box,
  HardDrive,
  Play,
  RotateCw,
  FolderGit2,
  CheckCircle2,
} from 'lucide-react';
import { LocalModel, SystemStats } from '../types';

interface OverviewDashboardProps {
  stats: SystemStats | null;
  models: LocalModel[];
  onSelectTab: (tab: string) => void;
  onLoadModel: (name: string) => void;
  onUnloadModel: (name: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  models,
  onSelectTab,
  onLoadModel,
  onUnloadModel,
}) => {
  const [benchPrompt, setBenchPrompt] = useState('Explain why local private LLMs ensure zero data leakage');
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchOutput, setBenchOutput] = useState('');
  const [benchMetrics, setBenchMetrics] = useState<{ tokPerSec: number; durationMs: number; tokenCount: number } | null>(null);

  const activeModel = models.find((m) => m.loaded) || models[0];

  const runBenchmark = async () => {
    if (!benchPrompt.trim() || benchRunning) return;
    setBenchRunning(true);
    setBenchOutput('');
    setBenchMetrics(null);

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel?.name || 'llama3.3:8b',
          prompt: benchPrompt,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                accumulated += data.response;
                tokenCount += 1;
                setBenchOutput(accumulated);
              }
            } catch (err) {
              // ignore
            }
          }
        }
      }
      const durationMs = Math.round(performance.now() - startTime);
      const tokPerSec = +(tokenCount / (durationMs / 1000)).toFixed(1);
      setBenchMetrics({ tokPerSec: tokPerSec > 0 ? tokPerSec : 0, durationMs, tokenCount });
    } catch (err: any) {
      setBenchOutput(`Benchmark failed: ${err.message || 'Cannot connect to model daemon'}. Ensure Ollama is running and a model is loaded.`);
      setBenchMetrics(null);
    } finally {
      setBenchRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Daemon Status */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Daemon Status</span>
            <span className="text-slate-400 font-mono text-[11px]">PORT {stats?.daemon_listening_port || 11434}</span>
          </div>
          <div className={`text-xl font-bold tracking-tight flex items-center gap-2 ${stats?.api_ready ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${stats?.api_ready ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{stats?.api_ready ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span>{stats?.version ? `v${stats.version}` : 'Ollama Offline'}</span>
            <span aria-hidden="true">·</span>
            <span>REST API</span>
          </div>
        </div>

        {/* 2. Loaded Model */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Loaded Model</span>
            <span className={activeModel ? 'text-cyan-400 font-mono text-[11px]' : 'text-slate-500 font-mono text-[11px]'}>
              {activeModel?.loaded ? 'IN MEMORY' : 'DISK'}
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight truncate">
            {activeModel?.name || 'None'}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span>{activeModel?.details?.quantization_level || 'GGUF'}</span>
            <span aria-hidden="true">·</span>
            <span>{activeModel?.details?.parameter_size || 'Local Model'}</span>
          </div>
        </div>

        {/* 3. Host System RAM */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Host System RAM</span>
            <span className="text-slate-400 font-mono text-[11px]">PHYSICAL</span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight font-mono tabular-nums">
            {stats ? `${stats.used_ram_gb}` : '--'} <span className="text-xs text-slate-400 font-normal">/ {stats ? `${stats.total_ram_gb} GB` : '-- GB'}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span>{stats?.free_ram_gb !== undefined ? `Free: ${stats.free_ram_gb} GB` : 'Host Memory'}</span>
            <span aria-hidden="true">·</span>
            <span>OS Buffer</span>
          </div>
        </div>

        {/* 4. Host Compute / Platform */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Host Architecture</span>
            <span className="text-slate-400 font-mono text-[11px]">COMPUTE</span>
          </div>
          <div className="text-sm font-bold text-slate-200 tracking-tight truncate">
            {stats?.device || 'Local Host'}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span>Provider: {stats?.provider || 'ollama'}</span>
            <span aria-hidden="true">·</span>
            <span>Local-First</span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onSelectTab('terminal')}
          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg text-left transition-colors group"
        >
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/50 rounded-md text-cyan-400 group-hover:scale-105 transition-transform">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Terminal CLI</div>
            <div className="text-[11px] text-slate-400 font-mono">localai run {activeModel?.name}</div>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('agents')}
          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg text-left transition-colors group"
        >
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/50 rounded-md text-emerald-400 group-hover:scale-105 transition-transform">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Autonomous Agents</div>
            <div className="text-[11px] text-slate-400">Plan & execute tasks</div>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('models')}
          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg text-left transition-colors group"
        >
          <div className="p-2 bg-purple-950/60 border border-purple-800/50 rounded-md text-purple-400 group-hover:scale-105 transition-transform">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Model Registry</div>
            <div className="text-[11px] text-slate-400">{models.length} installed models</div>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('repo')}
          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg text-left transition-colors group"
        >
          <div className="p-2 bg-amber-950/60 border border-amber-800/50 rounded-md text-amber-400 group-hover:scale-105 transition-transform">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">GitHub Repo Files</div>
            <div className="text-[11px] text-slate-400">Full source & ZIP package</div>
          </div>
        </button>
      </div>

      {/* Main Content Split: Installed Models on Left, Real-Time Benchmark Workbench on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Installed Local Models Table */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Installed Models in Local Storage</h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Private weights stored locally · GGUF format
                </div>
              </div>
              <button
                onClick={() => onSelectTab('models')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                + Pull More
              </button>
            </div>

            {models.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-800 rounded-md my-3">
                <p className="text-xs text-slate-400">No models found in your local Ollama repository.</p>
                <p className="text-[11px] text-slate-500 mt-1">Pull a model via the Model Registry tab or run <code className="text-emerald-400">ollama pull llama3.2</code> in your terminal.</p>
                <button
                  onClick={() => onSelectTab('models')}
                  className="mt-4 px-3.5 py-1.5 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded transition-colors inline-block"
                >
                  Go to Model Registry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">Quantization</th>
                      <th className="py-2.5 px-3 text-right">Size</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                    {models.map((model) => (
                      <tr key={model.name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                          {model.loaded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          <span>{model.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {model.details?.quantization_level || 'GGUF'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                          {model.size ? `${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {model.loaded ? (
                            <span className="text-emerald-400 font-sans text-[11px]">In VRAM</span>
                          ) : (
                            <span className="text-slate-500 font-sans text-[11px]">Disk</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {model.loaded ? (
                            <button
                              onClick={() => onUnloadModel(model.name)}
                              className="text-[11px] font-sans text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              Unload
                            </button>
                          ) : (
                            <button
                              onClick={() => onLoadModel(model.name)}
                              className="text-[11px] font-sans text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                            >
                              Load
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Offline Ready · Zero Internet Required</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">~/.localai/models</span>
          </div>
        </div>

        {/* Right: Quick Inference Benchmark Workbench */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Latency & Tok/s Benchmark</h2>
              <span className="text-[11px] font-mono text-cyan-400">{activeModel?.name}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Test immediate inference latency and tokens per second throughput.
            </p>

            <div className="space-y-3">
              <textarea
                value={benchPrompt}
                onChange={(e) => setBenchPrompt(e.target.value)}
                rows={3}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-hidden focus:border-emerald-500 resize-none"
                placeholder="Enter a prompt to benchmark..."
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={runBenchmark}
                  disabled={benchRunning}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors"
                >
                  {benchRunning ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Benchmark Prompt</span>
                    </>
                  )}
                </button>

                {benchMetrics && (
                  <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                    <span className="text-emerald-400 tabular-nums font-semibold">
                      {benchMetrics.tokPerSec} tok/s
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="tabular-nums">{benchMetrics.durationMs}ms</span>
                  </div>
                )}
              </div>

              {/* Streaming Output Box */}
              <div className="min-h-[140px] max-h-[180px] overflow-y-auto p-3 bg-slate-950 border border-slate-800/80 rounded text-xs font-mono text-slate-300 leading-relaxed">
                {benchOutput ? (
                  benchOutput
                ) : (
                  <span className="text-slate-600">
                    Click "Benchmark Prompt" to view real-time streaming output and token performance metrics.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 mt-3">
            <span>Unified VRAM Buffer</span>
            <span className="font-mono text-slate-400">Context: 4,096 tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
};
