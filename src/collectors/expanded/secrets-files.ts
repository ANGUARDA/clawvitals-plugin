/**
 * secrets-files.ts — Regex-scans ~/.env and ~/.envrc for API key patterns.
 *
 * NEVER includes actual secret values in results — only pattern name + file + line number.
 * Files are capped at {@link MAX_LINES} lines to avoid OOM on unexpectedly large files.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { SecretsFilesResult, SecretFinding } from '../../types';

/** Maximum number of lines to scan per file to prevent memory exhaustion. */
const MAX_LINES = 10_000;

/** Known secret patterns — only pattern names are ever recorded, never values. */
export const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'OpenAI', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Anthropic', regex: /sk-ant-[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub', regex: /gh[ps]_[a-zA-Z0-9]{36}/ },
  { name: 'AWS', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Slack', regex: /xox[baprs]-[a-zA-Z0-9-]{10,}/ },
  { name: 'Generic API Key', regex: /[Aa][Pp][Ii]_?[Kk][Ee][Yy]\s*=\s*[^\s]{10,}/ },
];

const TARGET_FILES = ['.env', '.envrc'];

/**
 * Scan a single file for secret patterns.
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
 * Scan ~/.env and ~/.envrc for known API key patterns.
 * Returns pattern name + file + line number for each match — never the secret value.
 */
export function collectSecretsFiles(): SecretsFilesResult {
  try {
    const home = os.homedir();
    const findings: SecretFinding[] = [];

    for (const file of TARGET_FILES) {
      findings.push(...scanFile(path.join(home, file)));
    }

    return { ok: true, findings, error: null };
  } catch (err) {
    return { ok: false, findings: [], error: (err as Error).message };
  }
}
