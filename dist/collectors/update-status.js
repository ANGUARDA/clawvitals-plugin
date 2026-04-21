/**
 * collectors/update-status.ts — Collects `openclaw update status --json` output.
 */
export async function collectUpdateStatus(cli) {
    try {
        const result = await cli.run(['update', 'status', '--json']);
        const parsed = JSON.parse(result.stdout);
        if (!parsed || typeof parsed.update !== 'object') {
            throw new Error('Schema mismatch: missing or invalid fields in update status output');
        }
        return { ok: true, data: parsed, ts: Date.now(), error: null };
    }
    catch (err) {
        return {
            ok: false, data: null, ts: null,
            error: err instanceof Error ? err.message : 'Unknown error during update status collection',
        };
    }
}
//# sourceMappingURL=update-status.js.map