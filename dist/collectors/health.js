/**
 * collectors/health.ts — Collects `openclaw health --json` output.
 */
export async function collectHealth(cli) {
    try {
        const result = await cli.run(['health', '--json']);
        const parsed = JSON.parse(result.stdout);
        if (!parsed || typeof parsed.ok !== 'boolean') {
            throw new Error('Unexpected health output shape');
        }
        return { ok: true, data: parsed, ts: parsed.ts, error: null };
    }
    catch (err) {
        return {
            ok: false, data: null, ts: null,
            error: err instanceof Error ? err.message : 'Unknown error during health collection',
        };
    }
}
//# sourceMappingURL=health.js.map