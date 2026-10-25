/**
 * Workspace and Security Boundary Manager for hmhslocal
 * Enforces strict sandbox containment inside workspaceRoot.
 * Prevents directory traversal (e.g., ../../../etc/passwd or C:\Windows).
 * Provides file read, write, patch (diff-safe search/replace), file search, and command execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import type { ExecException } from 'node:child_process';

export interface WorkspaceFileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: Date;
}

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class WorkspaceSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceSecurityError';
  }
}

export class WorkspaceManager {
  private readonly workspaceRoot: string;
  private readonly realWorkspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
    try {
      this.realWorkspaceRoot = fs.existsSync(this.workspaceRoot)
        ? fs.realpathSync(this.workspaceRoot)
        : this.workspaceRoot;
    } catch {
      this.realWorkspaceRoot = this.workspaceRoot;
    }
  }

  public getRoot(): string {
    return this.workspaceRoot;
  }

  private isWithinRoot(target: string, root: string): boolean {
    const normTarget = process.platform === 'win32' ? path.normalize(target).toLowerCase() : path.normalize(target);
    const normRoot = process.platform === 'win32' ? path.normalize(root).toLowerCase() : path.normalize(root);
    if (normTarget === normRoot) return true;
    const rel = path.relative(normRoot, normTarget);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  /**
   * Safely resolves a path and asserts that it stays strictly within the workspaceRoot.
   * Defends against:
   * - Null byte injection
   * - Directory traversal (../../)
   * - Windows drive letter switching & UNC escapes
   * - Symlink & junction escapes via realpath checks
   */
  public resolveSafePath(userPath: string): string {
    const trimmed = (userPath || '').trim();
    if (!trimmed) {
      return this.workspaceRoot;
    }

    if (trimmed.includes('\0')) {
      throw new WorkspaceSecurityError('Null byte detected in path');
    }

    // Resolve relative to workspace root
    const resolved = path.isAbsolute(trimmed)
      ? path.resolve(trimmed)
      : path.resolve(this.workspaceRoot, trimmed);

    // Lexical check
    if (!this.isWithinRoot(resolved, this.workspaceRoot)) {
      throw new WorkspaceSecurityError(
        `Path traversal blocked: "${userPath}" resolves to "${resolved}", which is outside workspace root "${this.workspaceRoot}".`
      );
    }

    // Symlink / Junction containment check via realpath
    if (fs.existsSync(resolved)) {
      try {
        const real = fs.realpathSync(resolved);
        if (!this.isWithinRoot(real, this.realWorkspaceRoot)) {
          throw new WorkspaceSecurityError(
            `Symlink escape blocked: "${userPath}" points to "${real}", which is outside workspace root "${this.realWorkspaceRoot}".`
          );
        }
      } catch (err: any) {
        if (err instanceof WorkspaceSecurityError) throw err;
      }
    } else {
      // For paths that do not exist yet (e.g. creating a new file), check closest existing parent
      let current = path.dirname(resolved);
      while (current && current !== path.dirname(current)) {
        if (fs.existsSync(current)) {
          try {
            const realParent = fs.realpathSync(current);
            if (!this.isWithinRoot(realParent, this.realWorkspaceRoot)) {
              throw new WorkspaceSecurityError(
                `Parent directory symlink escape blocked: "${userPath}" ancestor points to "${realParent}", which is outside workspace root "${this.realWorkspaceRoot}".`
              );
            }
          } catch (err: any) {
            if (err instanceof WorkspaceSecurityError) throw err;
          }
          break;
        }
        current = path.dirname(current);
      }
    }

    return resolved;
  }

  /**
   * Lists files and folders in a workspace directory (respecting security boundary).
   */
  public listDirectory(subPath = ''): WorkspaceFileEntry[] {
    const safeDir = this.resolveSafePath(subPath);
    if (!fs.existsSync(safeDir)) {
      throw new Error(`Directory does not exist: ${subPath}`);
    }

    const stat = fs.statSync(safeDir);
    if (!stat.isDirectory()) {
      throw new Error(`Target is not a directory: ${subPath}`);
    }

    const dirents = fs.readdirSync(safeDir, { withFileTypes: true });
    return dirents.map((dirent) => {
      const fullPath = path.join(safeDir, dirent.name);
      let sizeBytes = 0;
      let modifiedAt = new Date();
      try {
        const itemStat = fs.statSync(fullPath);
        sizeBytes = itemStat.size;
        modifiedAt = itemStat.mtime;
      } catch {
        // Handle inaccessible file
      }

      return {
        path: path.relative(this.workspaceRoot, fullPath),
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        sizeBytes,
        modifiedAt,
      };
    });
  }

  /**
   * Reads a file within the workspace safely.
   */
  public readFile(filePath: string, maxBytes = 5 * 1024 * 1024): string {
    const safePath = this.resolveSafePath(filePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${filePath}`);
    }

    if (stat.size > maxBytes) {
      throw new Error(`File exceeds max size limit (${stat.size} > ${maxBytes} bytes): ${filePath}`);
    }

    return fs.readFileSync(safePath, 'utf-8');
  }

  /**
   * Writes content to a file inside the workspace safely, creating parent folders if needed.
   */
  public writeFile(filePath: string, content: string): { path: string; bytesWritten: number } {
    const safePath = this.resolveSafePath(filePath);
    const parentDir = path.dirname(safePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(safePath, content, 'utf-8');
    const bytesWritten = Buffer.byteLength(content, 'utf-8');

    return {
      path: path.relative(this.workspaceRoot, safePath),
      bytesWritten,
    };
  }

  /**
   * Precise search-and-replace patch for safe code editing.
   */
  public patchFile(
    filePath: string,
    searchContent: string,
    replaceContent: string
  ): { path: string; occurrencesReplaced: number } {
    const safePath = this.resolveSafePath(filePath);
    const existing = this.readFile(filePath);

    if (!existing.includes(searchContent)) {
      throw new Error(
        `Patch target string not found in "${filePath}". Ensure exact match including whitespace.`
      );
    }

    const updated = existing.split(searchContent).join(replaceContent);
    const count = existing.split(searchContent).length - 1;

    fs.writeFileSync(safePath, updated, 'utf-8');

    return {
      path: path.relative(this.workspaceRoot, safePath),
      occurrencesReplaced: count,
    };
  }

  /**
   * Checks if a file exists within the workspace.
   */
  public fileExists(filePath: string): boolean {
    try {
      const safePath = this.resolveSafePath(filePath);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }

  /**
   * Recursively finds files matching a pattern or extension, skipping ignored dirs.
   */
  public findFiles(
    options: {
      extension?: string;
      searchTerm?: string;
      maxResults?: number;
      ignoreDirs?: string[];
    } = {}
  ): string[] {
    const results: string[] = [];
    const max = options.maxResults ?? 100;
    const ignoreDirs = new Set(options.ignoreDirs || ['node_modules', '.git', 'dist', 'build', '.cache']);

    const scan = (currentDir: string) => {
      if (results.length >= max) return;
      let dirents;
      try {
        dirents = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const dirent of dirents) {
        if (results.length >= max) break;
        const full = path.join(currentDir, dirent.name);

        if (dirent.isDirectory()) {
          if (!ignoreDirs.has(dirent.name)) {
            scan(full);
          }
        } else {
          const rel = path.relative(this.workspaceRoot, full);
          if (options.extension && !dirent.name.endsWith(options.extension)) {
            continue;
          }
          if (options.searchTerm) {
            try {
              const content = fs.readFileSync(full, 'utf-8');
              if (!content.includes(options.searchTerm)) continue;
            } catch {
              continue;
            }
          }
          results.push(rel);
        }
      }
    };

    scan(this.workspaceRoot);
    return results;
  }

  /**
   * Evaluates if a command poses an extreme security hazard (root deletion, disk format, pipe-to-shell)
   */
  public isDangerousCommand(command: string): { dangerous: boolean; reason?: string } {
    const trimmed = (command || '').trim();
    if (!trimmed) {
      return { dangerous: true, reason: 'Command string is empty' };
    }

    const dangerousPatterns: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\s+[/~]/i, reason: 'Recursive root directory wipe blocked' },
      { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\s+\.\.?(\s|$)/i, reason: 'Recursive workspace directory wipe blocked' },
      { pattern: /rmdir\s+\/[sS]\s+\/[qQ]\s+([a-zA-Z]:\\?|\/)/i, reason: 'Windows recursive drive root wipe blocked' },
      { pattern: /del\s+\/[fFqQsS\s]+([a-zA-Z]:\\?|\*.*)/i, reason: 'Unrestricted drive file wipe blocked' },
      { pattern: /format\s+[a-zA-Z]:/i, reason: 'Drive format blocked' },
      { pattern: /mkfs(\.[a-z0-9]+)?\s+/i, reason: 'Filesystem formatting blocked' },
      { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: 'Fork bomb blocked' },
      { pattern: /(curl|wget)\s+.*\|\s*(ba)?sh/i, reason: 'Piped remote script download cradle blocked' },
      { pattern: /powershell(\.exe)?\s+.*-[eE](nc(odedcommand)?)?\s+/i, reason: 'Obfuscated PowerShell cradle blocked' },
    ];

    for (const p of dangerousPatterns) {
      if (p.pattern.test(trimmed)) {
        return { dangerous: true, reason: p.reason };
      }
    }

    return { dangerous: false };
  }

  /**
   * Executes an approved shell command strictly in workspace directory with timeout.
   */
  public runCommand(command: string, timeoutMs = 30000): Promise<CommandExecutionResult> {
    return new Promise((resolve) => {
      const trimmed = (command || '').trim();
      const danger = this.isDangerousCommand(trimmed);
      if (danger.dangerous) {
        return resolve({
          command: trimmed,
          exitCode: 126,
          stdout: '',
          stderr: `Security policy blocked command: ${danger.reason}`,
          durationMs: 0,
        });
      }

      const startTime = Date.now();
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';

      exec(
        trimmed,
        {
          cwd: this.workspaceRoot,
          timeout: timeoutMs,
          shell,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, FORCE_COLOR: '0' },
        },
        (error: ExecException | null, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          resolve({
            command: trimmed,
            exitCode: error ? (error.code ?? 1) : 0,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            durationMs,
          });
        }
      );
    });
  }
}
