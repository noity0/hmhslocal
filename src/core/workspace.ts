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

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
  }

  public getRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Safely resolves a path and asserts that it stays strictly within the workspaceRoot.
   * Throws WorkspaceSecurityError if a path escapes the root.
   */
  public resolveSafePath(userPath: string): string {
    const trimmed = (userPath || '').trim();
    if (!trimmed) {
      return this.workspaceRoot;
    }

    // Resolve relative to workspace root
    const resolved = path.isAbsolute(trimmed)
      ? path.resolve(trimmed)
      : path.resolve(this.workspaceRoot, trimmed);

    // Normalize casing and separators
    const relative = path.relative(this.workspaceRoot, resolved);

    // If relative path starts with '..' or is root escape
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new WorkspaceSecurityError(
        `Path traversal blocked: "${userPath}" resolves to "${resolved}", which is outside workspace root "${this.workspaceRoot}".`
      );
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
   * Executes an approved shell command strictly in workspace directory with timeout.
   */
  public runCommand(command: string, timeoutMs = 30000): Promise<CommandExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';

      exec(
        command,
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
            command,
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
