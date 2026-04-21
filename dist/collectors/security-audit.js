/**
 * collectors/security-audit.ts — Collects `openclaw security audit --json` output.
 */
export async function collectSecurityAudit(cli) {
    try {
        const result = await cli.run(['security', 'audit', '--json']);
        const parsed = JSON.parse(result.stdout);
        if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.findings)) {
            throw new Error('Schema mismatch: missing or invalid fields in security audit output');
        }
        return { ok: true, data: parsed, ts: parsed.ts, error: null };
    }
    catch (err) {
        return {
            ok: false, data: null, ts: null,
            error: err instanceof SyntaxError
                ? `JSON parse error: ${err.message}`
                : err instanceof Error ? err.message : 'Unknown error during security audit collection',
        };
    }
}
//# sourceMappingURL=security-audit.js.map