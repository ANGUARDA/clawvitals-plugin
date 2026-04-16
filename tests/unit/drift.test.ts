import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  detectDrift,
  loadBaseline,
  saveBaseline,
  approveFile,
} from "../../src/cognitive/drift";
import type { CognitiveBaseline, DriftResult } from "../../src/cognitive/drift";
import type { CognitiveInventory } from "../../src/cognitive/inventory";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cog-drift-"));
}

function makeInventory(
  files: Array<{ name: string; sha256: string; size: number }>,
  workspaceDir = "/tmp/test"
): CognitiveInventory {
  return {
    files: files.map(f => ({ ...f, path: path.join(workspaceDir, f.name) })),
    scanned_at: new Date().toISOString(),
    workspace_dir: workspaceDir,
  };
}

function makeBaseline(
  files: Array<{ name: string; sha256: string; size: number }>
): CognitiveBaseline {
  const now = new Date().toISOString();
  return {
    files: files.map(f => ({
      ...f,
      approved_at: now,
      approved_by: "test",
    })),
    created_at: now,
    last_checked_at: now,
  };
}

describe("detectDrift", () => {
  it("no changes → has_drift false, all in unchanged", () => {
    const files = [
      { name: "SOUL.md", sha256: "abc123", size: 100 },
      { name: "MEMORY.md", sha256: "def456", size: 200 },
    ];
    const inventory = makeInventory(files);
    const baseline = makeBaseline(files);

    const result = detectDrift(inventory, baseline);
    expect(result.has_drift).toBe(false);
    expect(result.unchanged).toEqual(["SOUL.md", "MEMORY.md"]);
    expect(result.changed).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("changed hash → in changed array", () => {
    const inventory = makeInventory([
      { name: "SOUL.md", sha256: "new-hash", size: 100 },
    ]);
    const baseline = makeBaseline([
      { name: "SOUL.md", sha256: "old-hash", size: 100 },
    ]);

    const result = detectDrift(inventory, baseline);
    expect(result.has_drift).toBe(true);
    expect(result.changed).toEqual(["SOUL.md"]);
  });

  it("new file → in added array", () => {
    const inventory = makeInventory([
      { name: "SOUL.md", sha256: "abc", size: 100 },
      { name: "NEW.md", sha256: "xyz", size: 50 },
    ]);
    const baseline = makeBaseline([
      { name: "SOUL.md", sha256: "abc", size: 100 },
    ]);

    const result = detectDrift(inventory, baseline);
    expect(result.has_drift).toBe(true);
    expect(result.added).toEqual(["NEW.md"]);
  });

  it("removed file → in removed array", () => {
    const inventory = makeInventory([
      { name: "SOUL.md", sha256: "abc", size: 100 },
    ]);
    const baseline = makeBaseline([
      { name: "SOUL.md", sha256: "abc", size: 100 },
      { name: "OLD.md", sha256: "def", size: 200 },
    ]);

    const result = detectDrift(inventory, baseline);
    expect(result.has_drift).toBe(true);
    expect(result.removed).toEqual(["OLD.md"]);
  });
});

describe("approveFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates baseline for new file", () => {
    const inventory = makeInventory(
      [{ name: "SOUL.md", sha256: "abc123", size: 42 }],
      tmpDir
    );

    approveFile(tmpDir, "SOUL.md", inventory, "tester");

    const baseline = loadBaseline(tmpDir);
    expect(baseline).not.toBeNull();
    expect(baseline!.files).toHaveLength(1);
    expect(baseline!.files[0].name).toBe("SOUL.md");
    expect(baseline!.files[0].sha256).toBe("abc123");
    expect(baseline!.files[0].approved_by).toBe("tester");
  });

  it("updates existing file hash", () => {
    const inventory1 = makeInventory(
      [{ name: "SOUL.md", sha256: "old-hash", size: 42 }],
      tmpDir
    );
    approveFile(tmpDir, "SOUL.md", inventory1, "tester");

    const inventory2 = makeInventory(
      [{ name: "SOUL.md", sha256: "new-hash", size: 50 }],
      tmpDir
    );
    approveFile(tmpDir, "SOUL.md", inventory2, "tester");

    const baseline = loadBaseline(tmpDir);
    expect(baseline!.files).toHaveLength(1);
    expect(baseline!.files[0].sha256).toBe("new-hash");
    expect(baseline!.files[0].size).toBe(50);
  });
});

describe("loadBaseline", () => {
  it("returns null when missing", () => {
    const tmpDir = makeTmpDir();
    try {
      const result = loadBaseline(tmpDir);
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("saveBaseline", () => {
  it("creates file with readable content", () => {
    const tmpDir = makeTmpDir();
    try {
      const baseline = makeBaseline([
        { name: "SOUL.md", sha256: "abc", size: 100 },
      ]);
      saveBaseline(tmpDir, baseline);

      const loaded = loadBaseline(tmpDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.files).toHaveLength(1);
      expect(loaded!.files[0].name).toBe("SOUL.md");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
