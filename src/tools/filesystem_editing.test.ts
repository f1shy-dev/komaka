import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { write_file, read_file, edit_file_segment, mkdir } from "./filesystem";

globalThis.debug = false; // Keep noise down for these tests unless specifically debugging
globalThis.yolo = true;

function normalizeContent(str: string | undefined | null): string {
  return (str || "")
    .replace(/\r\n|\r/g, "\n") // Normalize newlines
    .replace(/[ \t]+$/gm, "") // Remove trailing spaces/tabs
    .replace(/\n{2,}/g, "\n\n") // Collapse multiple blank lines
    .trim();
}

describe("filesystem_editing tools", () => {
  const tempRoot = path.join(os.tmpdir(), `fs-edit-test-${Date.now()}`);
  const testDataDir = path.join(tempRoot, "test_data");

  const toolOptions = (id: string) => ({ toolCallId: id, messages: [] });

  const originalFilesDir = path.resolve(__dirname, "test_data");

  const copyFileToTemp = async (
    originalFileName: string,
    tempFileName: string
  ) => {
    const sourcePath = path.join(originalFilesDir, originalFileName);
    const destPath = path.join(testDataDir, tempFileName);
    const content = await fs.readFile(sourcePath, "utf8");
    await write_file.tool.execute(
      { file: destPath, content, encoding: "utf8" },
      toolOptions(`copy-${tempFileName}`)
    );
    return destPath;
  };

  const getExpectedContent = async (expectedFileName: string) => {
    const sourcePath = path.join(originalFilesDir, expectedFileName);
    return fs.readFile(sourcePath, "utf8");
  };

  beforeEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {}); // Ignore error if dir doesn't exist
    await mkdir.tool.execute(
      { dir: testDataDir, recursive: true },
      toolOptions("mkdir-temp")
    );
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  });

  // Rust Tests
  test("Rust: find_replace mode - single occurrence", async () => {
    const testFile = await copyFileToTemp(
      "sample_rust_code.unedited.rs",
      "test_rust_find_replace_single.rs"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "find_replace",
        file: testFile,
        find: "let mut x", // Target specific let binding
        replace: "let mut variable_x",
        all: false,
        inclusive: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-rust-frs-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(1);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-rust-frs-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_rust_code.find_replace_single.expected.rs"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("Rust: find_replace mode - all occurrences (regex)", async () => {
    const testFile = await copyFileToTemp(
      "sample_rust_code.unedited.rs",
      "test_rust_find_replace_all.rs"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "find_replace",
        file: testFile,
        find: "x", // Replace all 'x' (careful with broad replacements)
        replace: "VALUE",
        all: true,
        inclusive: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-rust-fra-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBeGreaterThan(5); // Expect multiple replacements
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-rust-fra-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_rust_code.find_replace_all.expected.rs"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("Rust: block mode - replace multi-line comment block", async () => {
    const testFile = await copyFileToTemp(
      "sample_rust_code.unedited.rs",
      "test_rust_block_replace.rs"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "block",
        file: testFile,
        start: "/\\*\\n     \\* This is a multi-line comment block.", // Escaped regex for start
        end: "     \\* Line 4 of comment block\\.\\n     \\*/", // Escaped regex for end
        replace: "// BLOCK REPLACED SUCCESSFULLY",
        includeMarkers: true,
        all: true,
        inclusive: true,
        encoding: "utf8",
      },
      toolOptions("edit-rust-br-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(1);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-rust-br-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_rust_code.block_replace.expected.rs"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("Rust: line_range mode - replace entire function", async () => {
    const testFile = await copyFileToTemp(
      "sample_rust_code.unedited.rs",
      "test_rust_line_replace.rs"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "line_range",
        file: testFile,
        startLine: 56, // Line where `fn calculate_new_value` starts
        endLine: 59, // Line where `fn calculate_new_value` ends
        replace:
          "// FUNCTION_REPLACED_BY_LINE_RANGE_EDIT\nfn new_simplified_calculation(val: i32) -> i32 {\n    val * 2 // A much simpler calculation\n}\n// END_OF_FUNCTION_REPLACEMENT",
        inclusive: true,
        all: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-rust-lr-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(4); // 4 lines replaced
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-rust-lr-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_rust_code.line_range_replace.expected.rs"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  // TypeScript Tests
  test("TS: find_replace mode - single occurrence (rename class property)", async () => {
    const testFile = await copyFileToTemp(
      "sample_typescript_code.unedited.ts",
      "test_ts_find_replace_single.ts"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "find_replace",
        file: testFile,
        find: "private users: Map<number, UserProfile>;",
        replace:
          "private userMap: Map<number, UserProfile>; // 'users' changed to 'userMap'",
        all: false,
        inclusive: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-ts-frs-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(1);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-ts-frs-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_typescript_code.find_replace_single.expected.ts"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("TS: find_replace mode - all occurrences (rename 'user' to 'USER')", async () => {
    const testFile = await copyFileToTemp(
      "sample_typescript_code.unedited.ts",
      "test_ts_find_replace_all.ts"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "find_replace",
        file: testFile,
        find: "user",
        replace: "USER",
        all: true,
        inclusive: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-ts-fra-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBeGreaterThan(10); // Expect many replacements
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-ts-fra-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_typescript_code.find_replace_all.expected.ts"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("TS: block mode - replace JSDoc and method signature", async () => {
    const testFile = await copyFileToTemp(
      "sample_typescript_code.unedited.ts",
      "test_ts_block_replace.ts"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "block",
        file: testFile,
        start: "/\\*\\*", // Start of JSDoc block
        end: "public deactivateUser\\(id: number\\): boolean \\{", // End at method signature
        replace: "// THIS ENTIRE JSDOC BLOCK AND METHOD SIGNATURE WAS REPLACED",
        includeMarkers: true,
        all: true,
        inclusive: true,
        encoding: "utf8",
      },
      toolOptions("edit-ts-br-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(1);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-ts-br-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_typescript_code.block_replace.expected.ts"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("TS: line_range mode - replace entire listActiveUsers function", async () => {
    const testFile = await copyFileToTemp(
      "sample_typescript_code.unedited.ts",
      "test_ts_line_replace.ts"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "line_range",
        file: testFile,
        startLine: 93, // Line where `public listActiveUsers(): UserProfile[] {` starts
        endLine: 100, // Line where `}` of listActiveUsers is
        replace:
          '  // The entire listActiveUsers function (lines 93-100) was replaced by this comment block.\n  // public listActiveUsers(): UserProfile[] {\n  //   console.log("listActiveUsers has been replaced by a line range edit.");\n  //   return [];\n  // }',
        inclusive: true,
        all: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-ts-lr-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(8); // 8 lines replaced
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-ts-lr-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_typescript_code.line_range_replace.expected.ts"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  // Markdown Tests
  test("MD: block mode - replace content between markers", async () => {
    const testFile = await copyFileToTemp(
      "sample_markdown.unedited.md",
      "test_md_block_replace.md"
    );
    const res = (await edit_file_segment.tool.execute(
      {
        mode: "block",
        file: testFile,
        start: "START_MARKER",
        end: "END_MARKER",
        replace:
          "\n**NEW CONTENT REPLACED THE OLD BLOCK**\nThis new block is also multi-line.\n",
        includeMarkers: false,
        all: true,
        inclusive: true,
        encoding: "utf8",
      },
      toolOptions("edit-md-br-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(1);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-md-br-1")
    );
    const expectedContent = await getExpectedContent(
      "sample_markdown.block_replace.expected.md"
    );
    expect(normalizeContent(editedContent.content)).toBe(
      normalizeContent(expectedContent)
    );
  });

  test("MD: find_replace - replace all occurrences of 'target'", async () => {
    const testFile = await copyFileToTemp(
      "sample_markdown.unedited.md",
      "test_md_find_replace.md"
    );
    const originalContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-md-fr-orig")
    );
    const initialTargetCount = (originalContent.content?.match(/target/g) || [])
      .length;
    expect(initialTargetCount).toBe(3); // Corrected: Based on the unedited markdown

    const res = (await edit_file_segment.tool.execute(
      {
        mode: "find_replace",
        file: testFile,
        find: "target",
        replace: "REPLACED_TARGET",
        all: true,
        inclusive: true,
        includeMarkers: false,
        encoding: "utf8",
      },
      toolOptions("edit-md-fr-1")
    )) as any;
    expect(res.success).toBe(true);
    expect(res.matches).toBe(initialTargetCount);
    const editedContent = await read_file.tool.execute(
      { file: testFile, encoding: "utf8" },
      toolOptions("read-md-fr-edit")
    );
    expect(editedContent.content).not.toContain("target");
    expect(editedContent.content?.match(/REPLACED_TARGET/g)?.length).toBe(
      initialTargetCount
    );
  });
});
