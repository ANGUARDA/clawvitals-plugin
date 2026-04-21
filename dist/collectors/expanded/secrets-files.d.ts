/**
 * secrets-files.ts — Regex-scans ~/.env and ~/.envrc for API key patterns.
 *
 * NEVER includes actual secret values in results — only pattern name + file + line number.
 * Files are capped at {@link MAX_LINES} lines to avoid OOM on unexpectedly large files.
 */
import type { SecretsFilesResult } from '../../types';
/** Known secret patterns — only pattern names are ever recorded, never values. */
export declare const SECRET_PATTERNS: Array<{
    name: string;
    regex: RegExp;
}>;
/**
 * Scan ~/.env and ~/.envrc for known API key patterns.
 * Returns pattern name + file + line number for each match — never the secret value.
 */
export declare function collectSecretsFiles(): SecretsFilesResult;
//# sourceMappingURL=secrets-files.d.ts.map