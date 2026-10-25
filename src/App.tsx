import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ChatPlayground } from './components/ChatPlayground';
import { AgentStudio } from './components/AgentStudio';
import { ModelManager } from './components/ModelManager';
import { InteractiveTerminal } from './components/InteractiveTerminal';
import { ModelfileStudio } from './components/ModelfileStudio';
import { RepoExplorer } from './components/RepoExplorer';
import { SettingsModal } from './components/SettingsModal';
import { LocalModel, SystemStats } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [models, setModels] = useState<LocalModel[]>([
    {
      name: 'llama3.3:8b',
      size: 4729118208,
      digest: 'sha256:a718d2bf412e8b21714bc12690d56c4d7b51b3e15777ce02cae06e30018b105a',
      modified_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      details: { format: 'gguf', family: 'llama', parameter_size: '8B', quantization_level: 'Q4_K_M' },
      loaded: true,
      vram_mb: 4720,
      description: 'Meta Llama 3.3 8B Instruct with 128k context and tool support',
    },
    {
      name: 'deepseek-r1:8b',
      size: 4918239014,
      digest: 'sha256:f892c4a9103e51241151ba4938a16db2c55490a1877cb1017e452179a633190b',
      modified_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      details: { format: 'gguf', family: 'qwen2', parameter_size: '8B', quantization_level: 'Q4_K_M' },
      loaded: false,
      vram_mb: 4950,
      description: 'DeepSeek R1 reasoning model distilled from Llama 8B with chain-of-thought tokens',
    },
    {
      name: 'qwen2.5-coder:7b',
      size: 4421980000,
      digest: 'sha256:28bc5f91e10260492160ae5280b59b12401889ca21469e7161b3698b488734e1',
      modified_at: new Date(Date.now() - 3600000 * 140).toISOString(),
      details: { format: 'gguf', family: 'qwen2', parameter_size: '7B', quantization_level: 'Q4_K_M' },
      loaded: false,
      vram_mb: 4410,
      description: 'Alibaba Qwen 2.5 Coder optimized for coding, debugging, and terminal bash scripting',
    },
    {
      name: 'mistral:7b',
      size: 4128500000,
      digest: 'sha256:61e88e884507b3d11b338e55e0037a8b417c8225d3a5ca853c0fae1b4bfa293c',
      modified_at: new Date(Date.now() - 3600000 * 300).toISOString(),
      details: { format: 'gguf', family: 'mistral', parameter_size: '7B', quantization_level: 'Q4_K_M' },
      loaded: false,
      vram_mb: 4100,
      description: 'Mistral 7B Instruct v0.3 with sliding window attention',
    },
    {
      name: 'phi-4:14b',
      size: 8910000000,
      digest: 'sha256:82b7c4a1029e00188b64e521096a56e7b42006351296bf1b6598c47b5901237a',
      modified_at: new Date(Date.now() - 3600000 * 80).toISOString(),
      details: { format: 'gguf', family: 'phi4', parameter_size: '14B', quantization_level: 'Q4_K_M' },
      loaded: false,
      vram_mb: 8850,
      description: 'Microsoft Phi-4 14B state-of-the-art synthetic reasoning model',
    },
  ]);

  const activeModel = models.find((m) => m.loaded) || models[0];

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      // offline/fallback
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      }
    } catch (e) {
      // offline/fallback
    }
  };

  useEffect(() => {
    fetchStats();
    fetchModels();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadModel = async (name: string) => {
    try {
      await fetch('/api/models/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setModels((prev) =>
        prev.map((m) => ({
          ...m,
          loaded: m.name === name,
        }))
      );
      fetchStats();
    } catch (e) {
      setModels((prev) =>
        prev.map((m) => ({
          ...m,
          loaded: m.name === name,
        }))
      );
    }
  };

  const handleUnloadModel = async (name: string) => {
    try {
      await fetch('/api/models/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setModels((prev) =>
        prev.map((m) => (m.name === name ? { ...m, loaded: false } : m))
      );
      fetchStats();
    } catch (e) {
      setModels((prev) =>
        prev.map((m) => (m.name === name ? { ...m, loaded: false } : m))
      );
    }
  };

  const handleRegisterCustomModel = (newModel: LocalModel) => {
    setModels((prev) => [newModel, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Strict Top Bar Contract Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeModelName={activeModel?.name}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Workspace Navigation */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          stats={stats}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {currentTab === 'dashboard' && (
            <OverviewDashboard
              stats={stats}
              models={models}
              onSelectTab={setCurrentTab}
              onLoadModel={handleLoadModel}
              onUnloadModel={handleUnloadModel}
            />
          )}

          {currentTab === 'playground' && (
            <ChatPlayground
              models={models}
              activeModelName={activeModel?.name || 'llama3.3:8b'}
              onSelectModel={handleLoadModel}
            />
          )}

          {currentTab === 'agents' && (
            <AgentStudio
              models={models}
              activeModelName={activeModel?.name || 'llama3.3:8b'}
            />
          )}

          {currentTab === 'models' && (
            <ModelManager
              models={models}
              onLoadModel={handleLoadModel}
              onUnloadModel={handleUnloadModel}
              onRefreshModels={fetchModels}
            />
          )}

          {currentTab === 'terminal' && (
            <InteractiveTerminal
              models={models}
              activeModelName={activeModel?.name || 'llama3.3:8b'}
            />
          )}

          {currentTab === 'modelfile' && (
            <ModelfileStudio
              models={models}
              onRegisterCustomModel={handleRegisterCustomModel}
            />
          )}

          {currentTab === 'repo' && <RepoExplorer />}

          {currentTab === 'settings' && <SettingsModal stats={stats} />}
        </main>
      </div>
    </div>
  );
}
