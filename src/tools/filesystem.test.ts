import { test, expect } from "bun:test";
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
} from "./filesystem";
globalThis.debug = true;
globalThis.yolo = true;

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

test("filesystem: setup temp dirs and files", async () => {
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
  expect(await fs.stat(file1)).toBeTruthy();
  expect(await fs.stat(file2)).toBeTruthy();
  expect(await fs.stat(nodeModuleFile)).toBeTruthy();
  expect(await fs.stat(gitFile)).toBeTruthy();
});

test("filesystem: list_directory non-recursive", async () => {
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
  expect(res.files.some((f) => f.split(path.sep).includes(".git"))).toBe(false);
});

test("filesystem: list_directory recursive", async () => {
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
  expect(res.files.some((f) => f.split(path.sep).includes(".git"))).toBe(false);
});

test("filesystem: list_directory with vc and pkg dirs", async () => {
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

test("filesystem: read_file", async () => {
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

test("filesystem: stat_file", async () => {
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

test("filesystem: delete_file", async () => {
  await delete_file.tool.execute({ file: file1 }, toolOptions("del-1"));
  await expect(fs.stat(file1)).rejects.toThrow();
});

test("filesystem: cleanup temp", async () => {
  await cleanup();
  await expect(fs.stat(tempRoot)).rejects.toThrow();
});
