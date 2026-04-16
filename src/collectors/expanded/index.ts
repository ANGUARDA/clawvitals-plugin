/**
 * collectors/expanded/index.ts — ExpandedCollectorOrchestrator: parallel system-level collection.
 *
 * Runs all 8 expanded collectors in parallel via Promise.allSettled for resilience.
 */

import type { ExpandedCollectorResult } from '../../types';
import { collectOllama } from './ollama';
import { collectNetwork } from './network';
import { collectSecretsFiles } from './secrets-files';
import { collectSecretsHistory } from './secrets-history';
import { collectCloudflareTunnel } from './cloudflare-tunnel';
import { collectDocker } from './docker';
import { collectOsUpdates } from './os-updates';
import { collectDiskEncryption } from './disk-encryption';
import { MANAGEMENT_PORTS } from './network';

/** Build a fallback result when a collector's Promise rejects unexpectedly. */
function errorResult<T>(reason: unknown, defaults: T): T {
  const error = reason instanceof Error ? reason.message : 'Unknown error';
  return { ...defaults, ok: false, error };
}

export class ExpandedCollectorOrchestrator {
  async collect(options?: { extra_ports?: Array<{ port: number; service: string }> }): Promise<ExpandedCollectorResult> {
    const [
      ollamaResult,
      networkResult,
      secretsFilesResult,
      secretsHistoryResult,
      cloudflareTunnelResult,
      dockerResult,
      osUpdatesResult,
      diskEncryptionResult,
    ] = await Promise.allSettled([
      Promise.resolve(collectOllama()),
      Promise.resolve(collectNetwork(options?.extra_ports ? [...MANAGEMENT_PORTS, ...options.extra_ports] : undefined)),
      Promise.resolve(collectSecretsFiles()),
      Promise.resolve(collectSecretsHistory()),
      Promise.resolve(collectCloudflareTunnel()),
      Promise.resolve(collectDocker()),
      Promise.resolve(collectOsUpdates()),
      Promise.resolve(collectDiskEncryption()),
    ]);

    return {
      ollama: ollamaResult.status === 'fulfilled'
        ? ollamaResult.value
        : errorResult(ollamaResult.reason, { ok: false, bound_to_public: false, host: null, port: 11434, error: null }),
      network: networkResult.status === 'fulfilled'
        ? networkResult.value
        : errorResult(networkResult.reason, { ok: false, exposed_ports: [], error: null }),
      secrets_files: secretsFilesResult.status === 'fulfilled'
        ? secretsFilesResult.value
        : errorResult(secretsFilesResult.reason, { ok: false, findings: [], error: null }),
      secrets_history: secretsHistoryResult.status === 'fulfilled'
        ? secretsHistoryResult.value
        : errorResult(secretsHistoryResult.reason, { ok: false, findings: [], error: null }),
      cloudflare_tunnel: cloudflareTunnelResult.status === 'fulfilled'
        ? cloudflareTunnelResult.value
        : errorResult(cloudflareTunnelResult.reason, { ok: false, tunnel_found: false, unauthenticated_hostnames: [], other_tunnels_detected: [], error: null }),
      docker: dockerResult.status === 'fulfilled'
        ? dockerResult.value
        : errorResult(dockerResult.reason, { ok: false, docker_available: false, containers: [], error: null }),
      os_updates: osUpdatesResult.status === 'fulfilled'
        ? osUpdatesResult.value
        : errorResult(osUpdatesResult.reason, { ok: false, platform: 'unknown', auto_updates_enabled: false, error: null }),
      disk_encryption: diskEncryptionResult.status === 'fulfilled'
        ? diskEncryptionResult.value
        : errorResult(diskEncryptionResult.reason, { ok: false, platform: 'unknown', encrypted: false, error: null }),
    };
  }
}
