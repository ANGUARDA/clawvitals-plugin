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
/**
 * Files included in drift detection by default.
 * These define agent identity/behaviour — unexpected changes are security-relevant.
 */
export declare const DRIFT_MONITORED_BY_DEFAULT: Set<string>;
/**
 * Files excluded from drift detection by default.
 * These change frequently as part of normal agent operation.
 */
export declare const DRIFT_EXCLUDED_BY_DEFAULT: Set<string>;
export declare function scanCognitiveFiles(workspaceDir: string): CognitiveInventory;
//# sourceMappingURL=inventory.d.ts.map