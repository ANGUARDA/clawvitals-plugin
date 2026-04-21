/**
 * cli-runner.ts — Single, auditable wrapper around all OpenClaw CLI exec calls.
 *
 * This is the ONLY place in the codebase that invokes system commands.
 * Every collector MUST use CliRunner — never call exec directly. This module
 * enforces the binary allowlist, argument-as-array safety, and timeout policy.
 *
 * Uses runPluginCommandWithTimeout from the OpenClaw plugin SDK — no direct
 * direct shell access required.
 */
/** Thrown when a CLI command exceeds its timeout */
export declare class CliTimeoutError extends Error {
    constructor(command: string, timeoutMs: number);
}
/** Thrown when a CLI command exits with a non-zero code */
export declare class CliExecError extends Error {
    /** The exit code returned by the process */
    readonly exitCode: number;
    /** Content written to stderr */
    readonly stderr: string;
    constructor(command: string, exitCode: number, stderr: string);
}
/** Thrown when a disallowed binary is requested */
export declare class CliDisallowedBinaryError extends Error {
    constructor(binary: string);
}
/** Options for a CLI command execution */
export interface CliRunOptions {
    /** Timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
    /** Whether to parse stdout as JSON (default: false) */
    parseJson?: boolean;
}
/** Result of a successful CLI command execution */
export interface CliRunResult {
    /** Standard output content */
    stdout: string;
    /** Standard error content */
    stderr: string;
    /** Process exit code */
    exitCode: number;
}
/**
 * CliRunner wraps all CLI invocations with security controls.
 *
 * Security invariants:
 * - Command must be in the ALLOWED_BINARIES list — rejects at construction time
 * - Args are passed as a string array — never interpolated into a shell string
 * - Default 30-second timeout prevents hung processes
 * - All invocations are logged for debugging
 */
export declare class CliRunner {
    private readonly binary;
    /**
     * Create a CliRunner for a specific binary.
     *
     * @param binary - The binary to execute (must be in ALLOWED_BINARIES)
     * @throws CliDisallowedBinaryError if the binary is not in the allowlist
     */
    constructor(binary: string);
    /**
     * Execute a CLI command with security controls.
     *
     * @param args - Arguments as a string array (never interpolated)
     * @param options - Timeout and parsing options
     * @returns The command's stdout, stderr, and exit code
     * @throws CliTimeoutError if the command exceeds the timeout
     * @throws CliExecError if the command exits with a non-zero code
     */
    run(args: string[], options?: CliRunOptions): Promise<CliRunResult>;
}
//# sourceMappingURL=cli-runner.d.ts.map