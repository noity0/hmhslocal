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
  const [currentTab, setCurrentTab] = useState<string>('terminal');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);

  const activeModel = models.find((m) => m.loaded) || models[0] || null;

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.api_ready === false) {
          setIsOffline(true);
        } else {
          setIsOffline(false);
        }
      }
    } catch {
      setIsOffline(true);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        if (data.offline) {
          setIsOffline(true);
          setOfflineHint(data.hint || data.error || null);
          setModels([]);
        } else {
          setIsOffline(false);
          setOfflineHint(null);
          setModels(Array.isArray(data.models) ? data.models : []);
        }
      }
    } catch {
      setIsOffline(true);
      setModels([]);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchModels();
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadModel = async (name: string) => {
    try {
      const res = await fetch('/api/models/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchModels();
        await fetchStats();
      }
    } catch {
      // offline
    }
  };

  const handleUnloadModel = async (name: string) => {
    try {
      const res = await fetch('/api/models/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchModels();
        await fetchStats();
      }
    } catch {
      // offline
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
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-4">
          {isOffline && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
              <div className="space-y-1">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Local Ollama Daemon Disconnected</span>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  {offlineHint || 'Ollama is not reachable at the configured address. Run `ollama serve` in a terminal or verify Settings.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    fetchStats();
                    fetchModels();
                  }}
                  className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-700/60 rounded transition-colors"
                >
                  Retry Connection
                </button>
                <button
                  onClick={() => setCurrentTab('settings')}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                >
                  Configure Host
                </button>
              </div>
            </div>
          )}

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
              activeModelName={activeModel?.name || ''}
              onSelectModel={handleLoadModel}
            />
          )}

          {currentTab === 'agents' && (
            <AgentStudio
              models={models}
              activeModelName={activeModel?.name || ''}
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
              activeModelName={activeModel?.name || ''}
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
