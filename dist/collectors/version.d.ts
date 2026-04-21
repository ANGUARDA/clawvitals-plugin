/**
 * collectors/version.ts — Collects the current OpenClaw version via `openclaw --version`.
 *
 * The version string is required by NC-VERS-002 to compute version distance.
 * Output format is "OpenClaw YYYY.M.D (hash)" — we extract just the version number.
 */
import type { CliRunner } from '../cli-runner';
import type { VersionResult } from '../types';
/**
 * Collect the current OpenClaw version from the CLI.
 *
 * @param cli - The CliRunner instance for executing commands
 * @returns A version result with the parsed version string
 */
export declare function collectVersion(cli: CliRunner): Promise<VersionResult>;
//# sourceMappingURL=version.d.ts.map