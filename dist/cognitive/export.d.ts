export interface ExportResult {
    found: boolean;
    content?: string;
    path?: string;
    message?: string;
}
export declare function getLatestReport(workspaceDir: string, format?: "markdown" | "path"): ExportResult;
//# sourceMappingURL=export.d.ts.map