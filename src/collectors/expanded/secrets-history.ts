/**
 * secrets-history.ts — Scans shell history files for API key patterns.
 *
 * NEVER includes actual secret values in results — only pattern name + file + line number.
 * Files are capped at {@link MAX_LINES} lines to avoid OOM on large history files.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { SecretsHistoryResult, SecretFinding } from '../../types';
import { SECRET_PATTERNS } from './secrets-files';

/** Maximum number of lines to scan per file to prevent memory exhaustion. */
const MAX_LINES = 10_000;

const HISTORY_FILES = ['.zsh_history', '.bash_history'];

/**
 * Scan a single history file for secret patterns.
 * Returns findings with pattern name + file + line number — never the secret value.
 * Skips silently if the file does not exist or is unreadable.
 */
function scanFile(filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  try {
    if (!fs.existsSync(filePath)) return findings;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const limit = Math.min(lines.length, MAX_LINES);

    for (let i = 0; i < limit; i++) {
      for (const { name, regex } of SECRET_PATTERNS) {
        if (regex.test(lines[i])) {
          findings.push({
            file: filePath,
            pattern: name,
            line_hint: i + 1,
          });
        }
      }
    }
  } catch {
    // File unreadable — skip silently
  }
  return findings;
}

/**
 * Scan ~/.zsh_history and ~/.bash_history for known API key patterns.
 * Returns pattern name + file + line number for each match — never the secret value.
 * Non-existent files are silently skipped.
 */
export function collectSecretsHistory(): SecretsHistoryResult {
  try {
    const home = os.homedir();
    const findings: SecretFinding[] = [];

    for (const file of HISTORY_FILES) {
      findings.push(...scanFile(path.join(home, file)));
    }

    return { ok: true, findings, error: null };
  } catch (err) {
    return { ok: false, findings: [], error: (err as Error).message };
  }
}
