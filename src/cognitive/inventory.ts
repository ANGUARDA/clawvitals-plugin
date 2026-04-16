import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export interface CognitiveFile {
  name: string;
  path: string;
  size: number;
  sha256: string;
}

export interface CognitiveInventory {
  files: CognitiveFile[];
  scanned_at: string;
  workspace_dir: string;
  error?: string;
}

const PRIORITY_FILES = ["SOUL.md","IDENTITY.md","AGENTS.md","MEMORY.md","TOOLS.md","SECURITY.md","HEARTBEAT.md"];

export function scanCognitiveFiles(workspaceDir: string): CognitiveInventory {
  const scanned_at = new Date().toISOString();
  try {
    const entries = fs.readdirSync(workspaceDir).filter(f => f.endsWith(".md"));
    const priority = entries.filter(f => PRIORITY_FILES.includes(f));
    const others = entries.filter(f => !PRIORITY_FILES.includes(f));
    const ordered = [...PRIORITY_FILES.filter(f => priority.includes(f)), ...others];

    const files: CognitiveFile[] = [];
    for (const name of ordered) {
      const filePath = path.join(workspaceDir, name);
      try {
        const content = fs.readFileSync(filePath);
        const sha256 = crypto.createHash("sha256").update(content).digest("hex");
        const size = content.length;
        files.push({ name, path: filePath, size, sha256 });
      } catch {
        // skip unreadable files
      }
    }
    return { files, scanned_at, workspace_dir: workspaceDir };
  } catch (err) {
    return { files: [], scanned_at, workspace_dir: workspaceDir, error: (err as Error).message };
  }
}
