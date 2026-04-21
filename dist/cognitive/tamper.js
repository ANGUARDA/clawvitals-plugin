/**
 * cognitive/tamper.ts — Scan cognitive files for tampering / prompt injection indicators.
 *
 * NC-OC-011: Detects zero-width characters, instruction-override phrases,
 * and external script URLs in cognitive .md files.
 *
 * SECURITY: Findings never include matched content to avoid amplifying injections.
 */
import * as fs from 'fs';
const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\uFEFF]/;
// Patterns that detect common prompt-injection attempts in cognitive files.
const INSTRUCTION_OVERRIDE_PATTERNS = [
    /ignore\s+(?:all\s+)?previous\s+instructions?/i,
    /disregard\s+(?:all\s+)?prior/i,
    /you\s+are\s+now\b/i,
    /new\s+system\s+prompt/i,
];
const EXTERNAL_SCRIPT_URL_RE = /https?:\/\/(?:raw\.githubusercontent\.com|pastebin\.com|gist\.github\.com)\//i;
export function scanForTampering(files) {
    const findings = [];
    const errors = [];
    let filesScanned = 0;
    for (const file of files) {
        let content;
        try {
            content = fs.readFileSync(file.path, "utf-8");
        }
        catch (err) {
            errors.push(`${file.name}: ${err.message}`);
            continue;
        }
        filesScanned++;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            if (ZERO_WIDTH_RE.test(line)) {
                findings.push({ file: file.name, line: lineNum, pattern_type: "zero_width_chars" });
            }
            for (const pat of INSTRUCTION_OVERRIDE_PATTERNS) {
                if (pat.test(line)) {
                    findings.push({ file: file.name, line: lineNum, pattern_type: "instruction_override" });
                    break;
                }
            }
            if (EXTERNAL_SCRIPT_URL_RE.test(line)) {
                findings.push({ file: file.name, line: lineNum, pattern_type: "external_script_url" });
            }
        }
    }
    const result = { findings, files_scanned: filesScanned };
    if (errors.length > 0) {
        result.error = errors.join("; ");
    }
    return result;
}
//# sourceMappingURL=tamper.js.map