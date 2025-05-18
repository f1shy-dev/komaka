import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import {
  mkdir,
  write_file,
  read_file,
  list_directory,
  stat_file,
  delete_file,
  edit_file_segment,
} from "./filesystem";
globalThis.debug = true;
globalThis.yolo = true;

describe("filesystem tools", () => {
  const tempRoot = path.join(os.tmpdir(), `fs-test-${Date.now()}`);
  const nestedDir = path.join(tempRoot, "a/b/c");
  const nodeModulesDir = path.join(tempRoot, "node_modules");
  const gitDir = path.join(tempRoot, ".git");
  const file1 = path.join(tempRoot, "file1.txt");
  const file2 = path.join(nestedDir, "file2.txt");
  const nodeModuleFile = path.join(nodeModulesDir, "package.json");
  const gitFile = path.join(gitDir, "config");
  const gitignoreContent = `
*.log
temp/
.DS_Store
`;

  const toolOptions = (id: string) => ({ toolCallId: id, messages: [] });

  const cleanup = async () => {
    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
    } catch {}
  };

  const setupTestFiles = async () => {
    await cleanup();
    await mkdir.tool.execute(
      { dir: nestedDir, recursive: true },
      toolOptions("mkdir-1")
    );
    await mkdir.tool.execute(
      { dir: nodeModulesDir, recursive: true },
      toolOptions("mkdir-2")
    );
    await mkdir.tool.execute(
      { dir: gitDir, recursive: true },
      toolOptions("mkdir-3")
    );
    await write_file.tool.execute(
      { file: file1, content: "root file", encoding: "utf8" },
      toolOptions("write-1")
    );
    await write_file.tool.execute(
      { file: file2, content: "nested file", encoding: "utf8" },
      toolOptions("write-2")
    );
    await write_file.tool.execute(
      { file: nodeModuleFile, content: "{}", encoding: "utf8" },
      toolOptions("write-3")
    );
    await write_file.tool.execute(
      { file: gitFile, content: "git config", encoding: "utf8" },
      toolOptions("write-4")
    );
    await write_file.tool.execute(
      {
        file: path.join(tempRoot, ".gitignore"),
        content: gitignoreContent,
        encoding: "utf8",
      },
      toolOptions("write-5")
    );
    await write_file.tool.execute(
      {
        file: path.join(tempRoot, "test.log"),
        content: "log file",
        encoding: "utf8",
      },
      toolOptions("write-6")
    );
  };

  // Setup before each test
  beforeEach(async () => {
    await setupTestFiles();
  });

  // Cleanup after each test
  afterEach(async () => {
    await cleanup();
  });

  test("list_directory non-recursive", async () => {
    const res = await list_directory.tool.execute(
      { dir: tempRoot, recursive_depth: 0, includeVcAndPkgDirs: false },
      toolOptions("list-1")
    );
    console.log("Non-recursive files:", res.files);
    expect(res.success).toBe(true);
    expect(res.files.some((f) => f.endsWith("file1.txt"))).toBe(true);
    expect(res.files.some((f) => f.endsWith(".gitignore"))).toBe(true);
    expect(res.files.some((f) => f.endsWith("test.log"))).toBe(false);
    expect(
      res.files.some((f) => f.split(path.sep).includes("node_modules"))
    ).toBe(false);
    expect(res.files.some((f) => f.split(path.sep).includes(".git"))).toBe(
      false
    );
  });

  test("list_directory recursive", async () => {
    const res = await list_directory.tool.execute(
      {
        dir: tempRoot,
        recursive_depth: 3,
        includeVcAndPkgDirs: false,
      },
      toolOptions("list-2")
    );
    expect(res.success).toBe(true);
    expect(res.files.some((f) => f.endsWith("file1.txt"))).toBe(true);
    expect(res.files.some((f) => f.endsWith("file2.txt"))).toBe(true);
    expect(res.files.some((f) => f.endsWith(".gitignore"))).toBe(true);
    expect(res.files.some((f) => f.endsWith("test.log"))).toBe(false);
    expect(
      res.files.some((f) => f.split(path.sep).includes("node_modules"))
    ).toBe(false);
    expect(res.files.some((f) => f.split(path.sep).includes(".git"))).toBe(
      false
    );
  });

  test("list_directory with vc and pkg dirs", async () => {
    const res = await list_directory.tool.execute(
      {
        dir: tempRoot,
        recursive_depth: 3,
        includeVcAndPkgDirs: true,
      },
      toolOptions("list-3")
    );
    expect(res.success).toBe(true);
    expect(res.files.some((f) => f.endsWith("file1.txt"))).toBe(true);
    expect(res.files.some((f) => f.endsWith("file2.txt"))).toBe(true);
    expect(res.files.some((f) => f.endsWith(".gitignore"))).toBe(true);
    expect(res.files.some((f) => f.endsWith("test.log"))).toBe(true);
    expect(res.files.some((f) => f.includes("node_modules"))).toBe(true);
    expect(res.files.some((f) => f.includes(".git"))).toBe(true);
  });

  test("read_file", async () => {
    const res1 = await read_file.tool.execute(
      { file: file1, encoding: "utf8" },
      toolOptions("read-1")
    );
    expect(res1.content).toBe("root file");
    const res2 = await read_file.tool.execute(
      { file: file2, encoding: "utf8" },
      toolOptions("read-2")
    );
    expect(res2.content).toBe("nested file");
  });

  test("stat_file", async () => {
    const stat1 = await stat_file.tool.execute(
      { path: file1 },
      toolOptions("stat-1")
    );
    expect(stat1.isFile).toBe(true);
    expect(stat1.isDirectory).toBe(false);
    const stat2 = await stat_file.tool.execute(
      { path: nestedDir },
      toolOptions("stat-2")
    );
    expect(stat2.isDirectory).toBe(true);
  });

  test("delete_file", async () => {
    await delete_file.tool.execute({ file: file1 }, toolOptions("del-1"));
    await expect(fs.stat(file1)).rejects.toThrow();
  });

  describe("edit_file_segment", () => {
    test("find_replace mode", async () => {
      const testFile = path.join(tempRoot, "find_replace.txt");
      const content = "hello world\nhello universe\nhello multiverse";
      await write_file.tool.execute(
        { file: testFile, content, encoding: "utf8" },
        toolOptions("write-fr")
      );

      // Test single replace
      const res1 = (await edit_file_segment.tool.execute(
        {
          mode: "find_replace",
          file: testFile,
          find: "hello",
          replace: "hi",
          all: false,
          includeMarkers: false,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-fr-1")
      )) as any;
      expect(res1.success).toBe(true);
      expect(res1.matches).toBe(1);
      const content1 = await fs.readFile(testFile, "utf8");
      expect(content1).toBe("hi world\nhello universe\nhello multiverse");

      // Test replace all
      const res2 = (await edit_file_segment.tool.execute(
        {
          mode: "find_replace",
          file: testFile,
          find: "hello",
          replace: "hi",
          all: true,
          includeMarkers: false,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-fr-2")
      )) as any;
      expect(res2.success).toBe(true);
      expect(res2.matches).toBe(2);
      const content2 = await fs.readFile(testFile, "utf8");
      expect(content2).toBe("hi world\nhi universe\nhi multiverse");

      // Test regex replace
      const res3 = (await edit_file_segment.tool.execute(
        {
          mode: "find_replace",
          file: testFile,
          find: "hi \\w+",
          replace: "hello",
          all: true,
          includeMarkers: false,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-fr-3")
      )) as any;
      expect(res3.success).toBe(true);
      expect(res3.matches).toBe(3);
      const content3 = await fs.readFile(testFile, "utf8");
      expect(content3).toBe("hello\nhello\nhello");

      // Test no matches
      const res4 = (await edit_file_segment.tool.execute(
        {
          mode: "find_replace",
          file: testFile,
          find: "nonexistent",
          replace: "test",
          all: true,
          includeMarkers: false,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-fr-4")
      )) as any;
      expect(res4.success).toBe(false);
      expect(res4.matches).toBe(0);
      expect(res4.error).toBe("No matches found");
    });

    test("block mode", async () => {
      const testFile = path.join(tempRoot, "block.txt");
      const content = `start block 1
content 1
end block 1
other content
start block 2
content 2
end block 2`;
      await write_file.tool.execute(
        { file: testFile, content, encoding: "utf8" },
        toolOptions("write-block")
      );

      // Test block replace without markers
      const res1 = (await edit_file_segment.tool.execute(
        {
          mode: "block",
          file: testFile,
          start: "start block 1",
          end: "end block 1",
          replace: "new content 1",
          includeMarkers: false,
          all: true,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-block-1")
      )) as any;
      expect(res1.success).toBe(true);
      expect(res1.matches).toBe(1);
      const content1 = await fs.readFile(testFile, "utf8");
      expect(content1).toBe(
        `start block 1new content 1end block 1\nother content\nstart block 2\ncontent 2\nend block 2`
      );

      // Test block replace with markers
      const res2 = (await edit_file_segment.tool.execute(
        {
          mode: "block",
          file: testFile,
          start: "start block 2\\n",
          end: "end block 2",
          replace: "replaced entirely",
          includeMarkers: true,
          all: true,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-block-2")
      )) as any;
      expect(res2.success).toBe(true);
      expect(res2.matches).toBe(1);
      const content2 = await fs.readFile(testFile, "utf8");
      expect(content2).toBe(
        `start block 1new content 1end block 1\nother content\nreplaced entirely`
      );

      // Test no matches
      const res3 = (await edit_file_segment.tool.execute(
        {
          mode: "block",
          file: testFile,
          start: "nonexistent start",
          end: "nonexistent end",
          replace: "test",
          includeMarkers: false,
          all: true,
          inclusive: true,
          encoding: "utf8",
        },
        toolOptions("edit-block-3")
      )) as any;
      expect(res3.success).toBe(false);
      expect(res3.matches).toBe(0);
      expect(res3.error).toBe("No matches found");
    });

    test("line_range mode", async () => {
      const testFile = path.join(tempRoot, "line_range.txt");
      const content = "line 1\nline 2\nline 3\nline 4\nline 5";
      await write_file.tool.execute(
        { file: testFile, content, encoding: "utf8" },
        toolOptions("write-lr")
      );

      // Test inclusive range
      const res1 = (await edit_file_segment.tool.execute(
        {
          mode: "line_range",
          file: testFile,
          startLine: 2,
          endLine: 4,
          replace: "replaced lines",
          inclusive: true,
          all: true,
          includeMarkers: false,
          encoding: "utf8",
        },
        toolOptions("edit-lr-1")
      )) as any;
      expect(res1.success).toBe(true);
      expect(res1.matches).toBe(3);
      const content1 = await fs.readFile(testFile, "utf8");
      expect(content1).toBe("line 1\nreplaced lines\nline 5");

      // Test exclusive range
      const res2 = (await edit_file_segment.tool.execute(
        {
          mode: "line_range",
          file: testFile,
          startLine: 1,
          endLine: 2,
          replace: "new start",
          inclusive: false,
          all: true,
          includeMarkers: false,
          encoding: "utf8",
        },
        toolOptions("edit-lr-2")
      )) as any;
      expect(res2.success).toBe(true);
      expect(res2.matches).toBe(1);
      const content2 = await fs.readFile(testFile, "utf8");
      expect(content2).toBe("new start\nreplaced lines\nline 5");

      // Test out of bounds
      const res3 = (await edit_file_segment.tool.execute(
        {
          mode: "line_range",
          file: testFile,
          startLine: 10,
          endLine: 12,
          replace: "test",
          inclusive: true,
          all: true,
          includeMarkers: false,
          encoding: "utf8",
        },
        toolOptions("edit-lr-3")
      )) as any;
      expect(res3.success).toBe(false);
      expect(res3.matches).toBe(0);
      expect(res3.error).toBe("No matches found");
    });
  });
});
