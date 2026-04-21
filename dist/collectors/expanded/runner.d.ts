/**
 * runner.ts — Controlled execution wrapper for expanded system-level checks.
 *
 * This is the ONLY file in the expanded collectors that invokes system commands.
 * All expanded collectors (ollama, network, docker, etc.) MUST use runExpanded()
 * and never invoke commands directly.
 *
 * Uses runPluginCommandWithTimeout from the OpenClaw plugin SDK — consistent with
 * cli-runner.ts and the OpenClaw plugin execution model.
 *
 * Every binary used here is declared in openclaw.plugin.json commandsOptional so
 * users can review what system commands expanded mode will run.
 */
/**
 * Run a system command for an expanded check.
 * Returns stdout as a string, or throws on non-zero exit / timeout.
 *
 * @param argv - Command and arguments as an array (e.g. ['lsof', '-i', ':11434'])
 * @param timeoutMs - Optional timeout override
 */
export declare function runExpanded(argv: string[], timeoutMs?: number): Promise<string>;
//# sourceMappingURL=runner.d.ts.map