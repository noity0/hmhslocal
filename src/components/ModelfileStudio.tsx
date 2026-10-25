import React, { useState } from 'react';
import { FileCode2, Copy, Check, Play, Save, CheckCircle2, RotateCw } from 'lucide-react';
import { LocalModel } from '../types';

interface ModelfileStudioProps {
  models: LocalModel[];
  onRegisterCustomModel: (model: LocalModel) => void;
}

export const ModelfileStudio: React.FC<ModelfileStudioProps> = ({
  models,
  onRegisterCustomModel,
}) => {
  const [modelName, setModelName] = useState('senior-architect');
  const [baseModel, setBaseModel] = useState('llama3.3:8b');
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.95);
  const [numCtx, setNumCtx] = useState(8192);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are a Staff Technical Architect and Senior Software Engineer.
Your goal is to design clean, modular, resilient software systems.
Always produce typed TypeScript or idiomatic code without placeholders.
Structure answers with Architecture Decision Records (ADRs) when appropriate.`
  );
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawModelfile = `FROM ${baseModel}

# Inference Parameters
PARAMETER temperature ${temperature}
PARAMETER top_p ${topP}
PARAMETER num_ctx ${numCtx}
PARAMETER stop "<|eot_id|>"
PARAMETER stop "<|end_of_text|>"

# Custom Agent System Prompt
SYSTEM """
${systemPrompt.trim()}
"""`;

  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildSuccess(false);

    await new Promise((r) => setTimeout(r, 900));

    const newCustomModel: LocalModel = {
      name: `${modelName}:latest`,
      size: 4729118208,
      digest: 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      modified_at: new Date().toISOString(),
      details: { format: 'gguf', family: baseModel.split(':')[0], parameter_size: '8B', quantization_level: 'Q4_K_M' },
      loaded: false,
      vram_mb: 4720,
      description: `Custom model built from ${baseModel} with Modelfile`,
    };

    onRegisterCustomModel(newCustomModel);
    setIsBuilding(false);
    setBuildSuccess(true);
    setTimeout(() => setBuildSuccess(false), 3000);
  };

  const copyModelfile = () => {
    navigator.clipboard.writeText(rawModelfile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-emerald-400" />
            <span>Modelfile Studio & Custom Model Builder</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build specialized custom local agents with custom system prompts, parameters, and stop tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyModelfile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Modelfile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Builder */}
        <div className="lg:col-span-6 p-5 bg-slate-900/50 border border-slate-800 rounded-lg space-y-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
            Configuration Parameters
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Custom Model Tag Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-hidden focus:border-emerald-500"
              placeholder="e.g. senior-architect, security-pro, coder"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Base Foundation Model (FROM)</label>
            <select
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-hidden focus:border-emerald-500"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.details.quantization_level})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Temperature</span>
                <span className="text-emerald-400">{temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Top P</span>
                <span className="text-emerald-400">{topP}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Context Window (num_ctx)</label>
            <select
              value={numCtx}
              onChange={(e) => setNumCtx(parseInt(e.target.value))}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-hidden focus:border-emerald-500"
            >
              <option value={2048}>2,048 tokens</option>
              <option value={4096}>4,096 tokens</option>
              <option value={8192}>8,192 tokens</option>
              <option value={16384}>16,384 tokens</option>
              <option value={32768}>32,768 tokens</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">System Instruction (SYSTEM)</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-hidden focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleBuild}
            disabled={isBuilding || !modelName.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded transition-colors"
          >
            {isBuilding ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Building Custom Weights & Manifest...</span>
              </>
            ) : buildSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                <span>Built & Registered Successfully!</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Build Model (localai create {modelName} -f ./Modelfile)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Raw Modelfile Code View */}
        <div className="lg:col-span-6 p-5 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Raw Modelfile Syntax (Docker-like)
              </span>
              <span className="text-[11px] font-mono text-slate-400">./Modelfile</span>
            </div>

            <pre className="p-4 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
              {rawModelfile}
            </pre>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Terminal Command Equivalent:</div>
            <div className="font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 select-all">
              $ cat &lt;&lt; 'EOF' &gt; Modelfile<br />
              {rawModelfile.split('\n')[0]}<br />
              ...<br />
              EOF<br />
              $ localai create {modelName} -f ./Modelfile
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
