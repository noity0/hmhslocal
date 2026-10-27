/**
 * Small, deterministic terminal actions for common plain-language requests.
 * These run in the current terminal and never open a browser or web dashboard.
 */
import os from 'node:os';
import type { WorkspaceManager } from './workspace.ts';

type Confirm = (question: string) => Promise<boolean>;

function printCommandResult(label: string, result: { exitCode: number; stdout: string; stderr: string }) {
  console.log(`\n\x1b[36m${label}\x1b[0m`);
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  console.log(output ? output.split('\n').slice(0, 100).join('\n') : '(No output)');
  if (result.exitCode !== 0) console.log(`Command exited with code ${result.exitCode}.`);
}

export async function runSimpleTerminalAction(
  input: string,
  workspace: WorkspaceManager,
  confirm: Confirm
): Promise<boolean> {
  const p = input.trim().toLowerCase();
  if (!p) return false;

  if (/^(hi|hello|hey|salam|assalam[- ]?o[- ]?alaikum|good morning|good evening)[!. ]*$/.test(p)) {
    console.log('\nHello! I am hmhslocal, running in this terminal. Tell me what you want me to do, for example: show me all files, check network ports and IP, or create a file.\n');
    return true;
  }

  if (
    /\b(show|list|find|display)\b.*\b(files?|folders?|directory|directories)\b/.test(p) ||
    /\bwhat files\b/.test(p) ||
    /^(dir|ls|show files|list files)$/.test(p)
  ) {
    try {
      const files = workspace.findFiles({ maxResults: 100 });
      console.log(`\nFiles in ${workspace.getRoot()} (up to 100):\n`);
      if (files.length) files.forEach((file) => console.log(`  ${file}`));
      else console.log('No files found.');
      console.log();
    } catch (error) {
      console.error(`Could not list files: ${error instanceof Error ? error.message : String(error)}`);
    }
    return true;
  }

  if (/^(pwd|cwd|where am i|current (folder|directory|path)|show current (folder|directory|path))\??$/.test(p)) {
    console.log(`\nCurrent folder: ${workspace.getRoot()}\n`);
    return true;
  }

  if (/\b(network ports|check ports|list ports|open ports|netstat)\b/.test(p) || (/\b(ipconfig|ip address|my ip|network ip)\b/.test(p) && /\b(port|ports|network)\b/.test(p))) {
    const windows = os.platform() === 'win32';
    const ipCommand = windows ? 'ipconfig' : 'ip addr';
    const portsCommand = windows ? 'netstat -ano' : 'ss -ltnup';
    const wantsIp = /\b(ipconfig|ip address|my ip|network ip|check network)\b/.test(p);
    const wantsPorts = /\b(network ports|check ports|list ports|open ports|netstat)\b/.test(p);
    if (wantsIp || /\b(network)\b/.test(p) && wantsPorts) {
      printCommandResult(ipCommand, await workspace.runCommand(ipCommand));
    }
    if (wantsPorts) {
      printCommandResult(portsCommand, await workspace.runCommand(portsCommand));
    }
    return true;
  }

  if (/\b(check|show|view)\b.*\bgit status\b|^git status$|\bstatus of this repo\b/.test(p)) {
    printCommandResult('Git status', await workspace.runCommand('git status --short --branch'));
    return true;
  }

  if (/\b(push|upload)\b.*\b(latest changes|changes|to github|to git(hub)?)\b|^git push$/.test(p)) {
    const status = await workspace.runCommand('git status --short --branch');
    printCommandResult('Git status before push', status);
    if (status.exitCode !== 0) {
      console.log('\nThis folder does not appear to be a Git repository, or Git could not read its status.\n');
      return true;
    }
    const changedFiles = status.stdout.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('##'));
    if (changedFiles.length) {
      console.log('\nThere are uncommitted changes. For safety, I will not automatically stage or commit every file. Review and commit the intended files first, then ask me to push again.\n');
      return true;
    }
    if (!(await confirm('Push already-committed changes to the configured Git remote?'))) {
      console.log('\nPush cancelled.\n');
      return true;
    }
    printCommandResult('Git push', await workspace.runCommand('git push', 120000));
    return true;
  }

  return false;
}
