import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const PRIORITY_FILES = ["SOUL.md", "IDENTITY.md", "AGENTS.md", "MEMORY.md", "TOOLS.md", "SECURITY.md", "HEARTBEAT.md"];
/**
 * Files included in drift detection by default.
 * These define agent identity/behaviour — unexpected changes are security-relevant.
 */
export const DRIFT_MONITORED_BY_DEFAULT = new Set(["SOUL.md", "IDENTITY.md", "AGENTS.md", "USER.md"]);
/**
 * Files excluded from drift detection by default.
 * These change frequently as part of normal agent operation.
 */
export const DRIFT_EXCLUDED_BY_DEFAULT = new Set(["MEMORY.md", "TOOLS.md", "HEARTBEAT.md", "README.md"]);
export function scanCognitiveFiles(workspaceDir) {
    const scanned_at = new Date().toISOString();
    try {
        const entries = fs.readdirSync(workspaceDir).filter(f => f.endsWith(".md"));
        const priority = entries.filter(f => PRIORITY_FILES.includes(f));
        const others = entries.filter(f => !PRIORITY_FILES.includes(f));
        const ordered = [...PRIORITY_FILES.filter(f => priority.includes(f)), ...others];
        const files = [];
        for (const name of ordered) {
            const filePath = path.join(workspaceDir, name);
            try {
                const content = fs.readFileSync(filePath);
                const sha256 = crypto.createHash("sha256").update(content).digest("hex");
                const size = content.length;
                files.push({ name, path: filePath, size, sha256 });
            }
            catch {
                // skip unreadable files
            }
        }
        return { files, scanned_at, workspace_dir: workspaceDir };
    }
    catch (err) {
        return { files: [], scanned_at, workspace_dir: workspaceDir, error: err.message };
    }
}
//# sourceMappingURL=inventory.js.map