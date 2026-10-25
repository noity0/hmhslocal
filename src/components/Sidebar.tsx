import React from 'react';
import {
  LayoutDashboard,
  MessageSquareCode,
  Bot,
  Box,
  Terminal,
  FileCode2,
  FolderGit2,
  Settings,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { SystemStats } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  stats: SystemStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, stats }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'playground', label: 'Model Playground', icon: MessageSquareCode },
    { id: 'agents', label: 'Autonomous Agents', icon: Bot },
    { id: 'models', label: 'Model Registry', icon: Box },
    { id: 'terminal', label: 'Interactive Terminal', icon: Terminal },
    { id: 'modelfile', label: 'Modelfile Studio', icon: FileCode2 },
    { id: 'repo', label: 'GitHub Repo & Code', icon: FolderGit2 },
    { id: 'settings', label: 'Settings & Daemon', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0c1220] border-r border-slate-800/80 flex flex-col justify-between p-4 min-h-[calc(100vh-53px)]">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-2 mb-2">
            Local Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick CLI command hint */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Terminal CLI</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/60 select-all">
            npm install<br />
            npx localai run llama3.3:8b
          </div>
        </div>
      </div>

      {/* Hardware Telemetry Card */}
      <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Engine</span>
          </span>
          <span className="font-mono text-emerald-400 text-[10px]">11434 OK</span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>VRAM</span>
            <span className="text-slate-200 tabular-nums">
              {stats ? `${stats.allocated_vram_gb} GB / ${stats.total_vram_gb} GB` : '4.72 GB / 18 GB'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{
                width: stats ? `${(stats.allocated_vram_gb / stats.total_vram_gb) * 100}%` : '26%',
              }}
            />
          </div>

          <div className="flex justify-between text-slate-400 text-[11px] pt-1">
            <span>Inference Speed</span>
            <span className="text-emerald-400 tabular-nums">
              {stats ? `${stats.inference_tok_s} tok/s` : '48.6 tok/s'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
