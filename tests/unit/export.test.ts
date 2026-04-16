import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getLatestReport } from "../../src/cognitive/export";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cog-export-"));
}

describe("getLatestReport", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("no runs → message about no history", () => {
    const result = getLatestReport(tmpDir);
    expect(result.found).toBe(false);
    expect(result.message).toContain("No scan history");
  });

  it("with runs → returns latest report content", () => {
    const runsDir = path.join(tmpDir, "clawvitals", "runs");
    const run1 = path.join(runsDir, "2026-01-01T00-00-00Z");
    const run2 = path.join(runsDir, "2026-01-02T00-00-00Z");
    fs.mkdirSync(run1, { recursive: true });
    fs.mkdirSync(run2, { recursive: true });

    fs.writeFileSync(path.join(run1, "report.txt"), "Old report");
    fs.writeFileSync(path.join(run2, "report.txt"), "Latest report");

    const result = getLatestReport(tmpDir);
    expect(result.found).toBe(true);
    expect(result.content).toBe("Latest report");
  });

  it("path format → returns directory path", () => {
    const runsDir = path.join(tmpDir, "clawvitals", "runs");
    const run1 = path.join(runsDir, "2026-01-01T00-00-00Z");
    fs.mkdirSync(run1, { recursive: true });
    fs.writeFileSync(path.join(run1, "report.txt"), "A report");

    const result = getLatestReport(tmpDir, "path");
    expect(result.found).toBe(true);
    expect(result.path).toBe(run1);
  });
});
