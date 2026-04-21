/**
 * cognitive/tamper.ts — Scan cognitive files for tampering / prompt injection indicators.
 *
 * NC-OC-011: Detects zero-width characters, instruction-override phrases,
 * and external script URLs in cognitive .md files.
 *
 * SECURITY: Findings never include matched content to avoid amplifying injections.
 */
import type { CognitiveFile } from "./inventory.js";
export type PatternType = "zero_width_chars" | "instruction_override" | "external_script_url";
export interface TamperFinding {
    file: string;
    line: number;
    pattern_type: PatternType;
}
export interface TamperScanResult {
    findings: TamperFinding[];
    files_scanned: number;
    error?: string;
}
export declare function scanForTampering(files: CognitiveFile[]): TamperScanResult;
//# sourceMappingURL=tamper.d.ts.map