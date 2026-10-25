import React, { useState } from 'react';
import {
  FolderGit2,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  FileJson,
  Terminal,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { REPOSITORY_FILES, downloadFullRepositoryZip, RepoFile } from '../repo/repoFiles';

export const RepoExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<RepoFile>(REPOSITORY_FILES[0]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadFullRepositoryZip();
    } finally {
      setIsZipping(false);
    }
  };

  const copyFileContent = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInstallCommand = () => {
    const cmd = `# Clone and install OllamaNode Local AI Engine
git clone https://github.com/noity0/hmhslocal.git
cd hmhslocal
npm install
npm link
codex`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-amber-400" />;
    if (name.endsWith('.md')) return <FileText className="w-4 h-4 text-cyan-400" />;
    if (name.endsWith('.sh') || name.endsWith('.js')) return <Terminal className="w-4 h-4 text-emerald-400" />;
    return <FileCode className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-400" />
            <span>GitHub Repository & Complete Code Exporter</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete project source ready to push to GitHub or install via <code className="text-emerald-400 font-mono">npm install</code> in terminal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyInstallCommand}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors whitespace-nowrap"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy npm install Cmd</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{isZipping ? 'Creating ZIP...' : 'Download Full Repo (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Quick Installation Guide Strip */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>How to install and run in your terminal:</span>
        </div>
        <div className="font-mono text-xs text-slate-300 bg-slate-950 p-3 rounded border border-slate-800/80 leading-relaxed overflow-x-auto">
          <span className="text-slate-500"># 1. Unzip or clone repo, then install</span><br />
          <span className="text-emerald-400">$</span> npm install<br /><br />
          <span className="text-slate-500"># 2. Link CLI binary or use npx</span><br />
          <span className="text-emerald-400">$</span> npm link<br /><br />
          <span className="text-slate-500"># 3. Run private model in terminal</span><br />
          <span className="text-emerald-400">$</span> localai run llama3.3:8b<br /><br />
          <span className="text-slate-500"># 4. Launch web dashboard & Ollama daemon</span><br />
          <span className="text-emerald-400">$</span> npm run dev
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-320px)] min-h-[500px]">
        {/* Left: File Tree */}
        <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
              Repository Tree ({REPOSITORY_FILES.length} files)
            </div>
            {REPOSITORY_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded transition-colors text-left ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium border border-slate-700/80 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                  }`}
                >
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5 px-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ready for GitHub & npm publish</span>
          </div>
        </div>

        {/* Right: File Viewer */}
        <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col justify-between overflow-hidden">
          {/* Header of Viewer */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              {getFileIcon(selectedFile.name)}
              <span className="font-semibold">{selectedFile.path}</span>
              <span className="text-slate-500">· {selectedFile.language}</span>
            </div>

            <button
              onClick={copyFileContent}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy File</span>
            </button>
          </div>

          {/* File Body */}
          <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre className="whitespace-pre-wrap">{selectedFile.content}</pre>
          </div>

          {/* Footer of Viewer */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
            <span>Lines: {selectedFile.content.split('\n').length}</span>
            <span>UTF-8 · LF</span>
          </div>
        </div>
      </div>
    </div>
  );
};
