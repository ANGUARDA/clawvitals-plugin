/**
 * collectors/health.ts — Collects `openclaw health --json` output.
 */
import type { CliRunner } from '../cli-runner';
import type { HealthOutput, SourceResult } from '../types';
export declare function collectHealth(cli: CliRunner): Promise<SourceResult<HealthOutput>>;
//# sourceMappingURL=health.d.ts.map