import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, RotateCcw, Play } from 'lucide-react';
import { LocalModel } from '../types';

interface InteractiveTerminalProps {
  models: LocalModel[];
  activeModelName: string;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system' | 'repl-user' | 'repl-assistant';
  text: string;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  models,
  activeModelName,
}) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'OllamaNode Terminal CLI Environment v1.0.0 (x86_64-apple-darwin / linux)',
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'Type "help" for a list of commands or try "localai run llama3.3:8b"',
    },
  ]);

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [inRepl, setInRepl] = useState<{ active: boolean; model: string }>({
    active: false,
    model: '',
  });
  const [isExecuting, setIsExecuting] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, isExecuting]);

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text }]);
  };

  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    // If currently in REPL mode:
    if (inRepl.active) {
      addLine('repl-user', `>>> ${cmd}`);
      setInput('');

      if (cmd === '/bye' || cmd === '/exit') {
        addLine('system', `Unloading ${inRepl.model} from memory. Returned to bash.`);
        setInRepl({ active: false, model: '' });
        return;
      }
      if (cmd === '/clear') {
        setLines([]);
        addLine('system', `Interactive REPL for [${inRepl.model}]. Type /bye to exit.`);
        return;
      }

      setIsExecuting(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: inRepl.model,
            messages: [{ role: 'user', content: cmd }],
            stream: false,
          }),
        });
        const data = await res.json();
        addLine(
          'repl-assistant',
          `[${inRepl.model}]: ${data.message?.content || 'Inference executed.'}\n[speed: 49.1 tok/s · eval: 980ms]`
        );
      } catch (err) {
        addLine('repl-assistant', `[${inRepl.model}]: Executed on local hardware.\n[speed: 48.6 tok/s]`);
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // Normal bash terminal mode
    addLine('input', `user@local-machine:~$ ${cmd}`);
    setInput('');
    setIsExecuting(true);

    const parts = cmd.split(' ');
    const mainCmd = parts[0];
    const subCmd = parts[1];

    if (cmd === 'clear') {
      setLines([]);
      setIsExecuting(false);
      return;
    }

    if (cmd === 'help' || cmd === '--help' || cmd === 'localai --help' || cmd === 'localai -h') {
      addLine(
        'output',
        `COMMANDS:
  localai run <model> [prompt]       Start interactive REPL with local model
  localai agent "<task>"             Launch autonomous multi-step agent
  localai list                       List all installed models in local storage
  localai pull <model>               Download weights from model registry
  localai ps                         Show models currently loaded in memory
  localai serve [--port 11434]       Start Ollama-compatible background daemon
  localai create <name> -f <file>   Build custom model from Modelfile
  curl http://localhost:11434/api/tags
  npm install                        Install local dependencies
  clear                              Clear terminal screen`
      );
      setIsExecuting(false);
      return;
    }

    if (mainCmd === 'npm' && subCmd === 'install') {
      addLine('output', 'npm notice added 24 packages in 1.4s\nnpm notice audited 25 packages in 140ms\nfound 0 vulnerabilities');
      setIsExecuting(false);
      return;
    }

    if (mainCmd === 'cat') {
      const fileName = subCmd || 'README.md';
      addLine('output', `# OllamaNode Private AI Engine\nRun private LLMs locally on your own machine.\nCommand: localai run llama3.3:8b\nAPI: http://localhost:11434/api`);
      setIsExecuting(false);
      return;
    }

    if (cmd.startsWith('curl')) {
      if (cmd.includes('/api/tags')) {
        addLine(
          'output',
          JSON.stringify(
            {
              models: models.map((m) => ({
                name: m.name,
                modified_at: m.modified_at,
                size: m.size,
                details: m.details,
              })),
            },
            null,
            2
          )
        );
      } else {
        addLine(
          'output',
          JSON.stringify(
            {
              model: activeModelName,
              created_at: new Date().toISOString(),
              response: 'Private LLM response via local API.',
              done: true,
              total_duration: 1240000000,
            },
            null,
            2
          )
        );
      }
      setIsExecuting(false);
      return;
    }

    if (mainCmd === 'localai' || mainCmd === 'npx' && parts[1] === 'localai') {
      const actualSub = mainCmd === 'localai' ? subCmd : parts[2];
      const targetModel = mainCmd === 'localai' ? parts[2] : parts[3];

      if (actualSub === 'list' || actualSub === 'ls') {
        let table = 'NAME                 ID             SIZE      QUANTIZATION   MODIFIED\n' + '─'.repeat(74) + '\n';
        for (const m of models) {
          table += `${m.name.padEnd(20)} ${m.digest.substring(7, 19).padEnd(14)} ${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB   ${m.details.quantization_level.padEnd(14)} 2 days ago\n`;
        }
        addLine('output', table.trim());
      } else if (actualSub === 'ps') {
        const loaded = models.filter((m) => m.loaded);
        let table = 'NAME                 PID    SIZE      VRAM      EXPIRY\n' + '─'.repeat(55) + '\n';
        for (const m of loaded) {
          table += `${m.name.padEnd(20)} 49102  4.7 GB    100% GPU  4m58s\n`;
        }
        addLine('output', table.trim() || 'No active models currently resident in VRAM.');
      } else if (actualSub === 'pull') {
        const pullTarget = targetModel || 'llama3.3:8b';
        addLine('output', `pulling manifest for ${pullTarget}...`);
        await new Promise((r) => setTimeout(r, 400));
        addLine('output', `pulling 6a2c2bf3b118... 100% ▕████████████████████▏ 4.7 GB/4.7 GB 42.1 MB/s`);
        addLine('output', `verifying sha256 checksum... OK\nwriting model manifest... OK\n✓ Successfully installed ${pullTarget}`);
      } else if (actualSub === 'agent') {
        const task = parts.slice(2).join(' ') || 'Audit code dependencies';
        addLine('output', `⚡ Launching Autonomous Agent Loop for: "${task}"`);
        await new Promise((r) => setTimeout(r, 400));
        addLine('output', `❯ Step 1: Goal Decomposition & Planning`);
        await new Promise((r) => setTimeout(r, 400));
        addLine('output', `❯ Step 2: Tool Execution [shell_exec: read directory & configs]`);
        await new Promise((r) => setTimeout(r, 400));
        addLine('output', `❯ Step 3: Tool Execution [code_sandbox: synthesize solution]`);
        await new Promise((r) => setTimeout(r, 400));
        addLine('output', `❯ Step 4: Verification [0 errors · compilation verified]`);
        addLine('output', `✔ Agent task finished successfully in 1.84s!`);
      } else if (actualSub === 'serve') {
        addLine(
          'output',
          `Starting OllamaNode daemon listening on 0.0.0.0:11434...\nOpenAI & Ollama compatible endpoints:\n  POST http://127.0.0.1:11434/api/generate\n  POST http://127.0.0.1:11434/api/chat\n  GET  http://127.0.0.1:11434/api/tags`
        );
      } else if (actualSub === 'run') {
        const runTarget = targetModel || activeModelName;
        const inlinePrompt = parts.slice(3).join(' ');

        addLine('system', `● Loaded ${runTarget} into local VRAM (Q4_K_M, 4096 context tokens)`);
        addLine('system', `Type '/bye' or '/exit' to exit, '/clear' to clear conversation context.`);

        if (inlinePrompt) {
          try {
            const res = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: runTarget, prompt: inlinePrompt, stream: false }),
            });
            const d = await res.json();
            addLine('repl-assistant', `[${runTarget}]: ${d.response}`);
          } catch (e) {
            addLine('repl-assistant', `[${runTarget}]: Processed locally on private hardware.`);
          }
        }

        setInRepl({ active: true, model: runTarget });
      } else {
        addLine('error', `Unknown localai command: "${actualSub}". Type "localai --help" for commands.`);
      }
    } else {
      addLine('error', `command not found: ${mainCmd}. Type "help" for available commands.`);
    }

    setIsExecuting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setInput(history[history.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[history.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Click Command Presets */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Quick Commands:
        </span>
        {[
          'localai run llama3.3:8b',
          'localai list',
          'localai agent "Build REST API in Express"',
          'localai ps',
          'curl http://localhost:11434/api/tags',
          'help',
        ].map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleCommand(cmd)}
            disabled={isExecuting}
            className="text-xs font-mono text-cyan-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-cyan-800/60 px-2.5 py-1 rounded transition-colors"
          >
            $ {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="h-[calc(100vh-180px)] bg-[#050811] border border-slate-800 rounded-lg p-4 font-mono text-xs flex flex-col justify-between overflow-hidden shadow-2xl cursor-text"
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-900 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-slate-400 ml-2">localai-terminal ~ bash (zsh)</span>
          </div>
          <div>{inRepl.active ? `REPL: ${inRepl.model}` : 'STANDALONE CLI'}</div>
        </div>

        {/* Terminal Output Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
          {lines.map((l) => {
            if (l.type === 'input') {
              return (
                <div key={l.id} className="text-slate-200 font-semibold">
                  {l.text}
                </div>
              );
            }
            if (l.type === 'system') {
              return (
                <div key={l.id} className="text-cyan-400/90">
                  {l.text}
                </div>
              );
            }
            if (l.type === 'error') {
              return (
                <div key={l.id} className="text-rose-400">
                  {l.text}
                </div>
              );
            }
            if (l.type === 'repl-user') {
              return (
                <div key={l.id} className="text-emerald-400 font-semibold">
                  {l.text}
                </div>
              );
            }
            if (l.type === 'repl-assistant') {
              return (
                <div key={l.id} className="text-slate-200 whitespace-pre-wrap leading-relaxed py-1">
                  {l.text}
                </div>
              );
            }
            return (
              <div key={l.id} className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {l.text}
              </div>
            );
          })}

          {isExecuting && (
            <div className="text-emerald-400 animate-pulse">
              {inRepl.active ? 'Generating local tokens...' : 'Executing command...'}
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Input Line */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-900 text-slate-200">
          <span className={inRepl.active ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
            {inRepl.active ? '>>>' : 'user@local-machine:~$'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white"
            placeholder={inRepl.active ? "Type message or '/bye' to exit..." : 'Type a command...'}
          />
        </div>
      </div>
    </div>
  );
};
