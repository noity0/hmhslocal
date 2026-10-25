import React from 'react';
import { Download } from 'lucide-react';
import { downloadFullRepositoryZip } from '../repo/repoFiles';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeModelName?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, activeModelName }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#090d16] border-b border-slate-800/80 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark in Plus Jakarta Sans */}
      <a
        href="#dashboard"
        onClick={(e) => {
          e.preventDefault();
          onTabChange('dashboard');
        }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2.5"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
        <span>hmhslocal</span>
      </a>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
        <button
          onClick={() => onTabChange('terminal')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'terminal' ? 'text-white' : ''
          }`}
        >
          Terminal CLI
        </button>
        <button
          onClick={() => onTabChange('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'dashboard' ? 'text-white' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('playground')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'playground' ? 'text-white' : ''
          }`}
        >
          Playground
        </button>
        <button
          onClick={() => onTabChange('agents')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'agents' ? 'text-white' : ''
          }`}
        >
          Agents
        </button>
        <button
          onClick={() => onTabChange('repo')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'repo' ? 'text-white' : ''
          }`}
        >
          Repo Code
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Active:</span>
          <span className={activeModelName ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
            {activeModelName || 'None'}
          </span>
        </div>
        <button
          onClick={() => downloadFullRepositoryZip()}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Repo (ZIP)</span>
        </button>
      </div>
    </header>
  );
};
