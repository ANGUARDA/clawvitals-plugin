import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { scanCognitiveFiles } from "../../src/cognitive/inventory";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cog-inv-"));
}

describe("scanCognitiveFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns correct SHA256 and size for md files", () => {
    const content = "# Hello World\nThis is a test file.";
    fs.writeFileSync(path.join(tmpDir, "README.md"), content);

    const result = scanCognitiveFiles(tmpDir);
    expect(result.files).toHaveLength(1);

    const file = result.files[0];
    expect(file.name).toBe("README.md");
    expect(file.size).toBe(Buffer.from(content).length);
    const expectedHash = crypto.createHash("sha256").update(Buffer.from(content)).digest("hex");
    expect(file.sha256).toBe(expectedHash);
  });

  it("SOUL.md appears before other .md files in output", () => {
    fs.writeFileSync(path.join(tmpDir, "AAA.md"), "aaa");
    fs.writeFileSync(path.join(tmpDir, "SOUL.md"), "soul");
    fs.writeFileSync(path.join(tmpDir, "ZZZ.md"), "zzz");

    const result = scanCognitiveFiles(tmpDir);
    const names = result.files.map(f => f.name);
    expect(names[0]).toBe("SOUL.md");
    expect(names.indexOf("SOUL.md")).toBeLessThan(names.indexOf("AAA.md"));
  });

  it("empty dir returns empty files array", () => {
    const result = scanCognitiveFiles(tmpDir);
    expect(result.files).toEqual([]);
    expect(result.workspace_dir).toBe(tmpDir);
    expect(result.error).toBeUndefined();
  });

  it("non-existent dir returns error field", () => {
    const badDir = path.join(tmpDir, "does-not-exist");
    const result = scanCognitiveFiles(badDir);
    expect(result.files).toEqual([]);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });

  it("scanned_at is valid ISO string", () => {
    const result = scanCognitiveFiles(tmpDir);
    const parsed = new Date(result.scanned_at);
    expect(parsed.toISOString()).toBe(result.scanned_at);
  });

  it("files without .md extension are not included", () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "md file");
    fs.writeFileSync(path.join(tmpDir, "config.json"), '{}');
    fs.writeFileSync(path.join(tmpDir, "script.sh"), "#!/bin/bash");
    fs.writeFileSync(path.join(tmpDir, "notes.txt"), "notes");

    const result = scanCognitiveFiles(tmpDir);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe("README.md");
  });
});
