/**
 * secrets-history.ts — Scans shell history files for API key patterns.
 *
 * NEVER includes actual secret values in results — only pattern name + file + line number.
 * Files are capped at {@link MAX_LINES} lines to avoid OOM on large history files.
 */
import type { SecretsHistoryResult } from '../../types';
/**
 * Scan ~/.zsh_history and ~/.bash_history for known API key patterns.
 * Returns pattern name + file + line number for each match — never the secret value.
 * Non-existent files are silently skipped.
 */
export declare function collectSecretsHistory(): SecretsHistoryResult;
//# sourceMappingURL=secrets-history.d.ts.map