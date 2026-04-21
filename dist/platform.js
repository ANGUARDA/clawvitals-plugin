/**
 * platform.ts — PlatformClient: no-op wrapper for Phase 1 (pre-platform).
 *
 * All platform API calls are wrapped here. In Phase 1, every call returns
 * { ok: false, error: 'platform_not_available' }. When Phase 3 ships the
 * platform, only this module needs updating.
 */
/**
 * PlatformClient wraps all platform API interactions.
 * Phase 1: all methods are no-ops returning a clear "not available" response.
 */
export class PlatformClient {
    /**
     * Link an installation to an Anguarda account.
     * Phase 1: returns platform_not_available.
     */
    link(_orgToken, _installId, _hostName) {
        return Promise.resolve({ ok: false, error: 'platform_not_available' });
    }
    /**
     * Register an agent with the platform.
     * Phase 1: returns platform_not_available.
     */
    register(_orgToken, _installId) {
        return Promise.resolve({ ok: false, error: 'platform_not_available' });
    }
}
//# sourceMappingURL=platform.js.map