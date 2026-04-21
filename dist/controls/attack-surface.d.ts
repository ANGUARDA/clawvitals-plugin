/**
 * controls/attack-surface.ts — AttackSurfaceParser for the summary.attack_surface detail string.
 *
 * Parses the human-readable detail string from the `summary.attack_surface` finding
 * into a structured AttackSurface object. This parser is intentionally defensive:
 * unknown fields are logged but do not cause failure, and individual field parse
 * errors are tracked without aborting the entire parse.
 */
import type { AttackSurface } from '../types';
/**
 * Parse the attack_surface detail string into structured data.
 *
 * Expected format (one field per line, colon-separated):
 * ```
 * groups: open=0, allowlist=2
 * tools.elevated: enabled
 * hooks.webhooks: disabled
 * hooks.internal: enabled
 * browser control: disabled
 * ```
 *
 * @param detail - The raw detail string from the summary.attack_surface finding
 * @returns Structured attack surface data with parse status
 */
export declare function parseAttackSurface(detail: string): AttackSurface;
//# sourceMappingURL=attack-surface.d.ts.map