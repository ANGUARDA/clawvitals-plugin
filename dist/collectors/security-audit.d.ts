/**
 * collectors/security-audit.ts — Collects `openclaw security audit --json` output.
 */
import type { CliRunner } from '../cli-runner';
import type { SecurityAuditOutput, SourceResult } from '../types';
export declare function collectSecurityAudit(cli: CliRunner): Promise<SourceResult<SecurityAuditOutput>>;
//# sourceMappingURL=security-audit.d.ts.map