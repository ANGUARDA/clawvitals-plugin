/**
 * orchestrator.ts — ScanOrchestrator: full scan pipeline.
 *
 * Encapsulates the complete 17-step scan pipeline previously in handleScan.
 * The intent router calls ScanOrchestrator.run() for both manual and
 * scheduled scans.
 */
import type { CollectorOrchestrator } from './collectors';
import type { ControlEvaluator } from './controls/evaluator';
import type { Scorer } from './scoring';
import type { DeltaDetector } from './scoring/delta';
import type { ReportGenerator } from './reporting';
import type { StorageManager } from './reporting/storage';
import type { ConfigManager } from './config';
import type { TelemetryClient } from './telemetry/index';
import type { SchedulerManager } from './scheduling';
import type { RunReport } from './types';
/** Options for a scan run */
export interface ScanOptions {
    /** Whether this scan was triggered by cron */
    isScheduled: boolean;
    /** Scan mode: "standard" runs only OpenClaw checks, "expanded" adds system-level checks */
    mode?: 'standard' | 'expanded';
    /** Extra ports to scan for NC-NET-001, merged with MANAGEMENT_PORTS */
    extra_ports?: Array<{
        port: number;
        service: string;
    }>;
}
/**
 * ScanOrchestrator runs the complete scan pipeline.
 * Independently testable — all dependencies are injected.
 */
export declare class ScanOrchestrator {
    private readonly collector;
    private readonly evaluator;
    private readonly scorer;
    private readonly delta;
    private readonly reporter;
    private readonly storage;
    private readonly config;
    private readonly telemetry;
    private readonly scheduler;
    private readonly workspaceDir;
    constructor(collector: CollectorOrchestrator, evaluator: ControlEvaluator, scorer: Scorer, delta: DeltaDetector, reporter: ReportGenerator, storage: StorageManager, config: ConfigManager, telemetry: TelemetryClient, scheduler: SchedulerManager, workspaceDir: string);
    /** Get the scheduler manager for external use (e.g., schedule prompts) */
    getScheduler(): SchedulerManager;
    /**
     * Run the complete scan pipeline.
     *
     * Steps:
     * 1. Load config
     * 2. Acquire lock (with stale detection)
     * 3. Collect data from all sources
     * 4. Evaluate controls
     * 5. Score results
     * 6. Detect delta from previous run
     * 7. Assemble and store report
     * 8. Update usage state
     * 9. Send telemetry (fire and forget)
     * 10. Release lock
     *
     * @param options - Scan options (scheduled vs manual)
     * @returns The complete run report
     */
    run(options: ScanOptions): Promise<RunReport>;
    /** Get the lock file path */
    private getLockPath;
}
//# sourceMappingURL=orchestrator.d.ts.map