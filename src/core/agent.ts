/**
 * Autonomous AI Coding Agent for hmhslocal
 * Capable of:
 * 1. Inspecting workspace and relevant files
 * 2. Formulating a structured plan
 * 3. Generating unified diffs and writing/patching files
 * 4. Running verification commands (lint, build, test)
 * 5. Bounded self-repair loop (up to maxSelfRepairAttempts, default 3)
 * 6. Detailed summary of all modified files
 */

import path from 'node:path';
import { WorkspaceManager } from './workspace.ts';
import type { CommandExecutionResult } from './workspace.ts';
import type { AIProvider, ChatMessage } from './provider.ts';
import type { HmhslocalConfig } from './config.ts';

export interface AgentTaskRequest {
  prompt: string;
  targetFiles?: string[];
  runVerification?: boolean;
  verificationCommand?: string;
}

export interface FileChange {
  filePath: string;
  action: 'create' | 'modify';
  diff: string;
  applied: boolean;
}

export interface AgentTaskResult {
  success: boolean;
  plan: string;
  filesChanged: FileChange[];
  commandsRun: CommandExecutionResult[];
  repairAttempts: number;
  summary: string;
  error?: string;
}

export interface AgentCallbacks {
  onStatus?: (message: string) => void;
  onPlan?: (plan: string) => void;
  onFileDiff?: (filePath: string, diff: string, action: 'create' | 'modify') => void;
  confirmAction?: (description: string) => Promise<boolean>;
  onCommandOutput?: (result: CommandExecutionResult) => void;
  onRepairAttempt?: (attempt: number, max: number, error: string) => void;
}

export class CodingAgent {
  private workspace: WorkspaceManager;
  private provider: AIProvider;
  private config: HmhslocalConfig;

  constructor(workspace: WorkspaceManager, provider: AIProvider, config: HmhslocalConfig) {
    this.workspace = workspace;
    this.provider = provider;
    this.config = config;
  }

  /**
   * Helper to generate a unified-style diff between old and new text
   */
  public generateDiff(filePath: string, oldContent: string, newContent: string): string {
    const oldLines = oldContent ? oldContent.split('\n') : [];
    const newLines = newContent ? newContent.split('\n') : [];

    const lines: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
    ];

    if (!oldContent) {
      for (const line of newLines) {
        lines.push(`+ ${line}`);
      }
      return lines.join('\n');
    }

    // Line diffing
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        lines.push(`  ${oldLines[i]}`);
        i++;
        j++;
      } else {
        if (i < oldLines.length && (!newLines.includes(oldLines[i]) || j >= newLines.length)) {
          lines.push(`- ${oldLines[i]}`);
          i++;
        } else if (j < newLines.length) {
          lines.push(`+ ${newLines[j]}`);
          j++;
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Main Execution Entry Point
   */
  public async executeTask(
    request: AgentTaskRequest,
    callbacks?: AgentCallbacks
  ): Promise<AgentTaskResult> {
    const result: AgentTaskResult = {
      success: false,
      plan: '',
      filesChanged: [],
      commandsRun: [],
      repairAttempts: 0,
      summary: '',
    };

    try {
      callbacks?.onStatus?.('Step 1/5: Inspecting workspace structure...');

      // 1. Inspect Workspace
      const existingFiles = this.workspace.findFiles({ maxResults: 50 });
      const packageJsonExists = this.workspace.fileExists('package.json');
      let packageJsonContent = '';
      if (packageJsonExists) {
        try {
          packageJsonContent = this.workspace.readFile('package.json', 32000);
        } catch {
          // Ignore
        }
      }

      callbacks?.onStatus?.('Step 2/5: Formulating implementation plan...');

      // 2. Formulate Plan via Provider
      const planSystemPrompt = `You are hmhslocal's autonomous Senior Software Architect.
Analyze the user's coding request and create a concise, structured 3-bullet implementation plan.
State clearly what files will be created or modified.`;

      const planMessages: ChatMessage[] = [
        { role: 'system', content: planSystemPrompt },
        {
          role: 'user',
          content: `Task: ${request.prompt}\nWorkspace Files:\n${existingFiles.slice(0, 30).join('\n')}`,
        },
      ];

      let planText = '';
      await this.provider.chatStream(
        this.config.defaultModel,
        planMessages,
        (chunk) => {
          planText += chunk;
        }
      );

      result.plan = planText.trim();
      callbacks?.onPlan?.(result.plan);

      callbacks?.onStatus?.('Step 3/5: Generating code and diffs...');

      // 3. Generate Code
      const codeSystemPrompt = `You are hmhslocal's autonomous Coding Agent.
Generate the exact source code needed for the task.
Output ONLY a JSON array of file operations in this exact format:
[
  {
    "path": "relative/path/to/file.ext",
    "action": "create" | "modify",
    "content": "full source code content"
  }
]
No conversational markdown outside the JSON block.`;

      const codeMessages: ChatMessage[] = [
        { role: 'system', content: codeSystemPrompt },
        {
          role: 'user',
          content: `Task: ${request.prompt}\nPlan:\n${result.plan}\nExisting Workspace Structure:\n${existingFiles.slice(0, 30).join('\n')}`,
        },
      ];

      let codeGenResponse = '';
      await this.provider.chatStream(
        this.config.defaultModel,
        codeMessages,
        (chunk) => {
          codeGenResponse += chunk;
        }
      );

      // Extract JSON block
      const jsonMatch = codeGenResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let fileOps: Array<{ path: string; action: 'create' | 'modify'; content: string }> = [];

      if (jsonMatch) {
        try {
          fileOps = JSON.parse(jsonMatch[0]);
        } catch {
          // JSON parse failed, fallback to smart single-file detection
        }
      }

      // Fallback if model didn't return pure JSON
      if (fileOps.length === 0) {
        const inferredPath = this.inferTargetFilePath(request.prompt);
        fileOps = [
          {
            path: inferredPath,
            action: this.workspace.fileExists(inferredPath) ? 'modify' : 'create',
            content: this.cleanMarkdownCodeBlocks(codeGenResponse) || `// Generated for: ${request.prompt}\n`,
          },
        ];
      }

      // 4. Present Diffs and Apply Changes
      callbacks?.onStatus?.('Step 4/5: Reviewing diffs and applying changes...');

      for (const op of fileOps) {
        const safeRelPath = op.path.replace(/^[/\\]+/, '');
        const exists = this.workspace.fileExists(safeRelPath);
        const oldContent = exists ? this.workspace.readFile(safeRelPath) : '';
        const diff = this.generateDiff(safeRelPath, oldContent, op.content);

        callbacks?.onFileDiff?.(safeRelPath, diff, op.action);

        let shouldApply = true;
        if (!this.config.autoApproveSafeCommands && callbacks?.confirmAction) {
          shouldApply = await callbacks.confirmAction(
            `Apply changes to ${safeRelPath} (${op.action === 'create' ? 'New file' : 'Modify existing'})?`
          );
        }

        if (shouldApply) {
          this.workspace.writeFile(safeRelPath, op.content);
          result.filesChanged.push({
            filePath: safeRelPath,
            action: op.action,
            diff,
            applied: true,
          });
        } else {
          result.filesChanged.push({
            filePath: safeRelPath,
            action: op.action,
            diff,
            applied: false,
          });
        }
      }

      // 5. Verification & Self-Repair Loop
      if (request.runVerification !== false) {
        callbacks?.onStatus?.('Step 5/5: Verifying workspace integrity and syntax...');
        const verifyCmd = request.verificationCommand || (packageJsonExists ? 'npm run lint' : '');

        if (verifyCmd) {
          let repairAttempt = 0;
          let verified = false;

          while (repairAttempt <= this.config.maxSelfRepairAttempts && !verified) {
            const cmdRes = await this.workspace.runCommand(verifyCmd);
            result.commandsRun.push(cmdRes);
            callbacks?.onCommandOutput?.(cmdRes);

            if (cmdRes.exitCode === 0) {
              verified = true;
              break;
            }

            // Command failed - attempt repair if within limits
            repairAttempt++;
            result.repairAttempts = repairAttempt;

            if (repairAttempt > this.config.maxSelfRepairAttempts) {
              result.error = `Verification command failed after ${this.config.maxSelfRepairAttempts} repair attempts: ${cmdRes.stderr || cmdRes.stdout}`;
              break;
            }

            callbacks?.onRepairAttempt?.(repairAttempt, this.config.maxSelfRepairAttempts, cmdRes.stderr || cmdRes.stdout);

            // Ask model to fix the error
            const repairMessages: ChatMessage[] = [
              {
                role: 'system',
                content: `You are hmhslocal's Self-Repair Engine.
The command "${verifyCmd}" failed with this output:
${cmdRes.stderr || cmdRes.stdout}

Fix the error in the files. Output ONLY the JSON array of corrected files:
[
  {
    "path": "path/to/file",
    "action": "modify",
    "content": "fixed complete code"
  }
]`,
              },
            ];

            let repairResponse = '';
            await this.provider.chatStream(
              this.config.defaultModel,
              repairMessages,
              (chunk) => {
                repairResponse += chunk;
              }
            );

            const repairMatch = repairResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (repairMatch) {
              try {
                const repairOps = JSON.parse(repairMatch[0]);
                for (const rOp of repairOps) {
                  this.workspace.writeFile(rOp.path, rOp.content);
                }
              } catch {
                // Ignore parse errors on repair
              }
            }
          }
        }
      }

      result.success = !result.error && result.filesChanged.some((f) => f.applied);
      result.summary = `Agent finished: ${result.filesChanged.filter((f) => f.applied).length} files updated, ${result.repairAttempts} self-repair iterations, ${result.commandsRun.length} commands run.`;
      callbacks?.onStatus?.(result.summary);

      return result;
    } catch (err: any) {
      result.success = false;
      result.error = err.message || String(err);
      return result;
    }
  }

  private inferTargetFilePath(prompt: string): string {
    const p = prompt.toLowerCase();
    const match = prompt.match(/(?:file|named|called|path|into)\s+([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      return match[1];
    }
    if (p.includes('react') || p.includes('component')) return 'src/components/NewComponent.tsx';
    if (p.includes('server') || p.includes('express')) return 'src/server-module.ts';
    if (p.includes('python') || p.includes('.py')) return 'script.py';
    if (p.includes('test')) return 'tests/agent-task.test.ts';
    if (p.includes('html')) return 'index.html';
    return 'solution.ts';
  }

  private cleanMarkdownCodeBlocks(raw: string): string {
    // If output is wrapped in ```lang ... ```, extract inside
    const blockMatch = raw.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    if (blockMatch && blockMatch[1]) {
      return blockMatch[1].trim();
    }
    return raw.trim();
  }
}
