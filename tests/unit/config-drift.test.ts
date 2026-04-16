import { detectConfigDrift } from "../../src/cognitive/config-drift";
import type { CollectorResult } from "../../src/types";

function makeCollectorResult(overrides?: Partial<CollectorResult>): CollectorResult {
  return {
    security_audit: {
      ok: true,
      data: {
        ts: 1710900000,
        summary: { critical: 0, warn: 1, info: 2 },
        findings: [
          { checkId: "gateway.nodes.deny_commands_ineffective", severity: "warn", title: "t", detail: "d" },
        ],
      },
      ts: 1710900000,
      error: null,
    },
    health: {
      ok: true,
      data: {
        ok: true,
        ts: 1710900000,
        durationMs: 50,
        channels: {
          slack: { configured: true, running: true, probe: { ok: true } },
        },
        agents: [],
        heartbeatSeconds: 30,
      },
      ts: 1710900000,
      error: null,
    },
    update_status: {
      ok: true,
      data: {
        update: {
          root: "/app",
          installKind: "npm",
          packageManager: "npm",
          registry: { latestVersion: "2026.3.13" },
          deps: { status: "ok" },
        },
        availability: {
          available: false,
          hasRegistryUpdate: false,
          latestVersion: "2026.3.13",
        },
        channel: { value: "stable" },
      },
      ts: 1710900000,
      error: null,
    },
    version_cmd: {
      ok: true,
      version: "2026.3.13",
      error: null,
    },
    attack_surface: null,
    ...overrides,
  };
}

describe("detectConfigDrift", () => {
  it("identical sources → no drift", () => {
    const a = makeCollectorResult();
    const b = makeCollectorResult();
    const result = detectConfigDrift(a, b);
    expect(result.has_drift).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it("new checkId appeared → added", () => {
    const previous = makeCollectorResult();
    const current = makeCollectorResult({
      security_audit: {
        ok: true,
        data: {
          ts: 1710900000,
          summary: { critical: 0, warn: 2, info: 2 },
          findings: [
            { checkId: "gateway.nodes.deny_commands_ineffective", severity: "warn", title: "t", detail: "d" },
            { checkId: "gateway.trusted_proxies_missing", severity: "warn", title: "t2", detail: "d2" },
          ],
        },
        ts: 1710900000,
        error: null,
      },
    });

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);

    const added = result.changes.filter(c => c.change_type === "added");
    expect(added.some(c => c.field === "security_audit.finding.gateway.trusted_proxies_missing")).toBe(true);
  });

  it("checkId disappeared → removed", () => {
    const previous = makeCollectorResult();
    const current = makeCollectorResult({
      security_audit: {
        ok: true,
        data: {
          ts: 1710900000,
          summary: { critical: 0, warn: 0, info: 2 },
          findings: [],
        },
        ts: 1710900000,
        error: null,
      },
    });

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);

    const removed = result.changes.filter(c => c.change_type === "removed");
    expect(removed.some(c => c.field === "security_audit.finding.gateway.nodes.deny_commands_ineffective")).toBe(true);
  });

  it("channel probe.ok changed false→true → change detected", () => {
    const previous = makeCollectorResult({
      health: {
        ok: true,
        data: {
          ok: false,
          ts: 1710900000,
          durationMs: 50,
          channels: {
            slack: { configured: true, running: true, probe: { ok: false } },
          },
          agents: [],
          heartbeatSeconds: 30,
        },
        ts: 1710900000,
        error: null,
      },
    });
    const current = makeCollectorResult();

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);

    const change = result.changes.find(c => c.field === "channels.slack.probe.ok");
    expect(change).toBeDefined();
    expect(change!.change_type).toBe("changed");
    expect(change!.previous).toBe(false);
    expect(change!.current).toBe(true);
  });

  it("hasRegistryUpdate changed → change detected", () => {
    const previous = makeCollectorResult();
    const current = makeCollectorResult({
      update_status: {
        ok: true,
        data: {
          update: {
            root: "/app",
            installKind: "npm",
            packageManager: "npm",
            registry: { latestVersion: "2026.4.0" },
            deps: { status: "ok" },
          },
          availability: {
            available: true,
            hasRegistryUpdate: true,
            latestVersion: "2026.4.0",
          },
          channel: { value: "stable" },
        },
        ts: 1710900000,
        error: null,
      },
    });

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);

    const change = result.changes.find(c => c.field === "update.availability.hasRegistryUpdate");
    expect(change).toBeDefined();
    expect(change!.previous).toBe(false);
    expect(change!.current).toBe(true);
  });

  it("version string changed → change detected", () => {
    const previous = makeCollectorResult();
    const current = makeCollectorResult({
      version_cmd: { ok: true, version: "2026.4.0", error: null },
    });

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);

    const change = result.changes.find(c => c.field === "version");
    expect(change).toBeDefined();
    expect(change!.previous).toBe("2026.3.13");
    expect(change!.current).toBe("2026.4.0");
  });

  it("one source failed (ok=false) → those fields skipped, no throw", () => {
    const previous = makeCollectorResult();
    const current = makeCollectorResult({
      security_audit: { ok: false, data: null, ts: null, error: "timeout" },
    });

    expect(() => detectConfigDrift(current, previous)).not.toThrow();
    const result = detectConfigDrift(current, previous);

    // Security audit fields from previous should appear as "removed"
    // but health/update/version fields should still be compared normally
    const securityChanges = result.changes.filter(c => c.field.startsWith("security_audit"));
    // All previous security_audit fields become "removed"
    expect(securityChanges.every(c => c.change_type === "removed")).toBe(true);
  });

  it("empty previous sources → all current fields treated as added", () => {
    const previous = makeCollectorResult({
      security_audit: { ok: false, data: null, ts: null, error: "no data" },
      health: { ok: false, data: null, ts: null, error: "no data" },
      update_status: { ok: false, data: null, ts: null, error: "no data" },
      version_cmd: { ok: false, version: null, error: "no data" },
    });
    const current = makeCollectorResult();

    const result = detectConfigDrift(current, previous);
    expect(result.has_drift).toBe(true);
    expect(result.changes.every(c => c.change_type === "added")).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);
  });
});
