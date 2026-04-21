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
import { runPluginCommandWithTimeout } from 'openclaw/plugin-sdk/run-command';
import { ALLOWED_BINARIES, CLI_TIMEOUT_MS } from './constants';
/** Thrown when a CLI command exceeds its timeout */
export class CliTimeoutError extends Error {
    constructor(command, timeoutMs) {
        super(`CLI command timed out after ${timeoutMs}ms: ${command}`);
        this.name = 'CliTimeoutError';
    }
}
/** Thrown when a CLI command exits with a non-zero code */
export class CliExecError extends Error {
    /** The exit code returned by the process */
    exitCode;
    /** Content written to stderr */
    stderr;
    constructor(command, exitCode, stderr) {
        super(`CLI command failed (exit ${exitCode}): ${command}\n${stderr}`);
        this.name = 'CliExecError';
        this.exitCode = exitCode;
        this.stderr = stderr;
    }
}
/** Thrown when a disallowed binary is requested */
export class CliDisallowedBinaryError extends Error {
    constructor(binary) {
        super(`Binary "${binary}" is not in the allowed list. ` +
            `Only these binaries may be executed: ${ALLOWED_BINARIES.join(', ')}`);
        this.name = 'CliDisallowedBinaryError';
    }
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
export class CliRunner {
    binary;
    /**
     * Create a CliRunner for a specific binary.
     *
     * @param binary - The binary to execute (must be in ALLOWED_BINARIES)
     * @throws CliDisallowedBinaryError if the binary is not in the allowlist
     */
    constructor(binary) {
        if (!ALLOWED_BINARIES.includes(binary)) {
            throw new CliDisallowedBinaryError(binary);
        }
        this.binary = binary;
    }
    /**
     * Execute a CLI command with security controls.
     *
     * @param args - Arguments as a string array (never interpolated)
     * @param options - Timeout and parsing options
     * @returns The command's stdout, stderr, and exit code
     * @throws CliTimeoutError if the command exceeds the timeout
     * @throws CliExecError if the command exits with a non-zero code
     */
    async run(args, options = {}) {
        const timeoutMs = options.timeoutMs ?? CLI_TIMEOUT_MS;
        const commandStr = `${this.binary} ${args.join(' ')}`;
        try {
            const result = await runPluginCommandWithTimeout({
                argv: [this.binary, ...args],
                timeoutMs,
            });
            if (result.code !== 0) {
                throw new CliExecError(commandStr, result.code, result.stderr);
            }
            return { stdout: result.stdout, stderr: result.stderr, exitCode: result.code };
        }
        catch (err) {
            if (err instanceof CliExecError)
                throw err;
            // Timeout or spawn failure from the SDK
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')) {
                throw new CliTimeoutError(commandStr, timeoutMs);
            }
            throw new CliExecError(commandStr, 1, msg);
        }
    }
}
//# sourceMappingURL=cli-runner.js.map