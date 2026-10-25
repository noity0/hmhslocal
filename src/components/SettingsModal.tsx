import React, { useState } from 'react';
import { Settings, Cpu, HardDrive, Network, ShieldCheck, Check, Copy } from 'lucide-react';
import { SystemStats } from '../types';

interface SettingsModalProps {
  stats: SystemStats | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ stats }) => {
  const [port, setPort] = useState(11434);
  const [backend, setBackend] = useState('metal');
  const [gpuLayers, setGpuLayers] = useState(33);
  const [threads, setThreads] = useState(8);
  const [keepAliveMin, setKeepAliveMin] = useState(5);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(`http://127.0.0.1:${port}`);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Local Engine & Ollama Daemon Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tune hardware compute acceleration, VRAM allocation layers, and networking endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hardware Acceleration Settings */}
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-lg space-y-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Compute Acceleration</span>
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">GPU Acceleration Backend</label>
            <select
              value={backend}
              onChange={(e) => setBackend(e.target.value)}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value="metal">Apple Silicon (Metal 3 / MPS Unified Memory)</option>
              <option value="cuda">NVIDIA CUDA 12.4 (TensorRT / cuBLAS)</option>
              <option value="rocm">AMD ROCm / HIP</option>
              <option value="cpu">CPU Only (AVX-512 / ARM Neon)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 flex justify-between font-mono">
              <span>GPU Offloaded Layers</span>
              <span className="text-emerald-400">{gpuLayers} / 33 (100% VRAM)</span>
            </label>
            <input
              type="range"
              min="0"
              max="33"
              value={gpuLayers}
              onChange={(e) => setGpuLayers(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 flex justify-between font-mono">
              <span>CPU Execution Threads</span>
              <span className="text-emerald-400">{threads} Cores</span>
            </label>
            <input
              type="range"
              min="1"
              max="16"
              value={threads}
              onChange={(e) => setThreads(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {/* Network & Daemon Settings */}
        <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-lg space-y-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Daemon & API Compatibility</span>
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Ollama Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 11434)}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500">
              Default is 11434. Allows Cursor, Continue.dev, and LangChain to connect instantly.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 flex justify-between font-mono">
              <span>Model Keep-Alive in VRAM</span>
              <span className="text-emerald-400">{keepAliveMin} minutes</span>
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={keepAliveMin}
              onChange={(e) => setKeepAliveMin(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={copyEndpoint}
              className="w-full flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded transition-colors"
            >
              {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy API URL (http://127.0.0.1:{port})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee Card */}
      <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-lg flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-white block">Strict Airgapped Privacy Guarantee</span>
          <p className="text-slate-400 leading-relaxed">
            All token generations, weights processing, and embeddings are performed directly in local memory.
            No prompts or files are ever transmitted to third-party cloud servers.
          </p>
        </div>
      </div>
    </div>
  );
};
