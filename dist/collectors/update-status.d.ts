/**
 * collectors/update-status.ts — Collects `openclaw update status --json` output.
 */
import type { CliRunner } from '../cli-runner';
import type { UpdateStatusOutput, SourceResult } from '../types';
export declare function collectUpdateStatus(cli: CliRunner): Promise<SourceResult<UpdateStatusOutput>>;
//# sourceMappingURL=update-status.d.ts.map