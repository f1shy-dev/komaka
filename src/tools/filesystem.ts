import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { withRender } from "./_framework";
import { requireConfirmation } from "./_confirmation";
import ignore from "ignore";

const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  ".bzr",
  ".yarn",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
];

const getIgnoreFilter = async (
  dir: string,
  includeVcAndPkgDirs: boolean
): Promise<(path: string) => boolean> => {
  if (includeVcAndPkgDirs) {
    return () => true;
  }

  const ig = ignore();
  ig.add(DEFAULT_IGNORE_PATTERNS.map((pattern) => pattern + "/**"));

  try {
    const gitignorePath = path.join(dir, ".gitignore");
    const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
    ig.add(gitignoreContent);
  } catch {
    // No .gitignore found, continue with default patterns
  }

  const normalizedDir = path.normalize(dir);
  return (filePath: string) => {
    const normalizedPath = path.normalize(filePath);
    const relativePath = path.relative(normalizedDir, normalizedPath);

    if (relativePath === "") {
      return true; // Always include the root directory
    }

    // Exclude if any part of the relative path matches a default ignore pattern
    const pathParts = relativePath.split(path.sep);
    if (pathParts.some((part) => DEFAULT_IGNORE_PATTERNS.includes(part))) {
      return false;
    }

    // Check if the path matches gitignore patterns
    return !ig.ignores(relativePath);
  };
};

const list_directory_recursive = async (
  dir: string,
  depth: number,
  shouldInclude: (path: string) => boolean
): Promise<string[]> => {
  const normalizedDir = path.normalize(dir);
  if (!shouldInclude(normalizedDir)) {
    return [];
  }

  const entries = await fs.readdir(normalizedDir, { withFileTypes: true });
  if (depth <= 0) {
    // Only return files that pass the filter
    return entries
      .filter((file) => file.isFile())
      .map((file) => path.join(normalizedDir, file.name))
      .filter(shouldInclude);
  }

  const files = entries
    .filter((file) => file.isFile())
    .map((file) => path.join(normalizedDir, file.name))
    .filter(shouldInclude);

  const dirs = entries
    .filter((file) => file.isDirectory())
    .map((dirent) => path.join(normalizedDir, dirent.name))
    .filter(shouldInclude);

  const results = await Promise.all(
    dirs.map((fullPath) =>
      list_directory_recursive(fullPath, depth - 1, shouldInclude)
    )
  );

  return [...files, ...results.flat()];
};

const listDirectoryParams = z
  .object({
    dir: z.string().describe("The directory to list"),
    recursive_depth: z
      .number()
      .optional()
      .default(0)
      .describe(
        "How deep to recurse into subdirectories. 0 means no recursion"
      ),
    includeVcAndPkgDirs: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to include version control and package management directories"
      ),
  })
  .strict();

export const list_directory = withRender(
  tool({
    description:
      "List files and directories in a given directory. By default, respects .gitignore and excludes common version control and package management directories (node_modules, .git, etc). This behavior can be disabled with includeVcAndPkgDirs parameter.",
    parameters: listDirectoryParams,
    execute: async ({
      dir,
      recursive_depth = 0,
      includeVcAndPkgDirs = false,
    }: z.infer<typeof listDirectoryParams>) => {
      const cwd = process.cwd();
      const resolved = path.resolve(cwd, dir);
      const realCwd = await fs.realpath(cwd);
      const realTarget = await fs.realpath(resolved).catch(() => resolved);
      if (!realTarget.startsWith(realCwd)) {
        const confirmed = await requireConfirmation(
          `Allow agent to list files in "${realTarget}"?`
        );
        if (!confirmed) {
          return {
            dir: resolved,
            files: [],
            success: false,
            error: `Listing files in "${realTarget}" was interactively disallowed by the user.`,
          };
        }
      }

      if (globalThis.debug) {
        console.debug("list_directory_recursive", {
          dir: resolved,
          recursive_depth,
          includeVcAndPkgDirs,
        });
      }

      const shouldInclude = await getIgnoreFilter(
        resolved,
        includeVcAndPkgDirs
      );
      const files = await list_directory_recursive(
        resolved,
        recursive_depth,
        shouldInclude
      );
      return {
        dir: resolved,
        files: files.map((f) => path.relative(resolved, f)),
        success: true,
      };
    },
  })
);

export const read_file = withRender(
  tool({
    description: "Read the contents of a file",
    parameters: z.object({
      file: z.string().describe("The file to read"),
      encoding: z.string().optional().default("utf8"),
    }),
    execute: async ({
      file,
      encoding,
    }: {
      file: string;
      encoding?: string;
    }) => {
      const enc: BufferEncoding =
        encoding && Buffer.isEncoding(encoding)
          ? (encoding as BufferEncoding)
          : "utf8";
      const content = await fs.readFile(file, { encoding: enc });
      return { file, content };
    },
  })
);

export const write_file = withRender(
  tool({
    description: "Write content to a file (overwrites if exists)",
    parameters: z.object({
      file: z.string().describe("The file to write to"),
      content: z.string().describe("The content to write"),
      encoding: z.string().optional().default("utf8"),
    }),
    execute: async ({
      file,
      content,
      encoding,
    }: {
      file: string;
      content: string;
      encoding?: string;
    }) => {
      const enc: BufferEncoding =
        encoding && Buffer.isEncoding(encoding)
          ? (encoding as BufferEncoding)
          : "utf8";
      await fs.writeFile(file, content, { encoding: enc });
      return { file, contentLength: content.length };
    },
  })
);

export const delete_file = withRender(
  tool({
    description: "Delete a file",
    parameters: z.object({
      file: z.string().describe("The file to delete"),
    }),
    execute: async ({ file }: { file: string }) => {
      await fs.unlink(file);
      return { file };
    },
  }),
  ({ file }) => `Deleted file: ${file}`
);

export const mkdir = withRender(
  tool({
    description: "Create a directory (recursively)",
    parameters: z.object({
      dir: z.string().describe("The directory to create"),
      recursive: z.boolean().optional().default(true),
    }),
    execute: async ({
      dir,
      recursive,
    }: {
      dir: string;
      recursive?: boolean;
    }) => {
      await fs.mkdir(dir, { recursive: recursive !== false });
      return { dir };
    },
  })
);

export const stat_file = withRender(
  tool({
    description: "Get file or directory stats",
    parameters: z.object({
      path: z.string().describe("The file or directory to stat"),
    }),
    execute: async ({ path: filePath }: { path: string }) => {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
      };
    },
  })
);

const editFileSegmentParams = z.object({
  file: z.string().describe("The file to edit"),
  replace: z.string().describe("The content to replace with"),
  encoding: z.string().optional().default("utf8"),
  mode: z.enum(["find_replace", "block", "line_range"]),
  // find_replace
  find: z.string().optional(),
  all: z.boolean().optional().default(true),
  // block
  start: z.string().optional(),
  end: z.string().optional(),
  includeMarkers: z.boolean().optional().default(false),
  // line_range
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  inclusive: z.boolean().optional().default(true),
});

export const edit_file_segment = withRender(
  tool({
    description: `Edit a segment of a file.

Modes - find_replace:
Replace all occurrences of a string/regex pattern with a new string.
- find: The string/regex pattern to find.
- all: Whether to replace all occurrences or just the first one.
- replace: The content to replace with.

Modes - block:
Replace a block of text between start and end markers.
- start: The start marker (string/regex).
- end: The end marker (string/regex).
- includeMarkers: Whether to include the start and end markers in the replacement.

Modes - line_range:
Replace a range of lines with a new string.
- startLine: The starting line number (1-based).
- endLine: The ending line number (1-based).
- inclusive: Whether to include the end line in the replacement.

Extra shared parameters:
- file: The file to edit.
- replace: The content to replace with.
`,
    parameters: editFileSegmentParams,
    execute: async (params: z.infer<typeof editFileSegmentParams>) => {
      const { file, replace, encoding = "utf8", mode } = params;
      const enc: BufferEncoding = Buffer.isEncoding(encoding)
        ? (encoding as BufferEncoding)
        : "utf8";

      const content = await fs.readFile(file, { encoding: enc });
      let newContent = content;
      let matches = 0;

      switch (mode) {
        case "find_replace": {
          const { find, all = true } = params;
          if (!find) {
            return {
              file,
              mode,
              matches: 0,
              success: false,
              error: "Missing required parameter: find",
            };
          }
          const regex = new RegExp(find, all ? "g" : "");
          if (all) {
            newContent = content.replace(regex, replace);
            matches = (content.match(regex) || []).length;
          } else {
            const match = content.match(regex);
            if (match) {
              newContent = content.replace(regex, replace);
              matches = 1;
            }
          }
          break;
        }
        case "block": {
          const { start, end, includeMarkers = false } = params;
          if (!start || !end) {
            return {
              file,
              mode,
              matches: 0,
              success: false,
              error: "Missing required parameter: start or end",
            };
          }
          const startRegex = new RegExp(start, "m");
          const endRegex = new RegExp(end, "m");
          const startMatch = content.match(startRegex);
          if (startMatch?.index == null) break;
          const afterStartIdx = startMatch.index + startMatch[0].length;
          const afterStart = content.slice(afterStartIdx);
          const endMatch = afterStart.match(endRegex);
          if (endMatch?.index == null) break;
          let blockStart, blockEnd;
          if (includeMarkers) {
            blockStart = startMatch.index;
            blockEnd = afterStartIdx + endMatch.index + endMatch[0].length;
          } else {
            blockStart = afterStartIdx;
            blockEnd = afterStartIdx + endMatch.index;
          }
          // Always print debug info for troubleshooting
          console.debug({
            blockStart,
            blockEnd,
            before: content.slice(0, blockStart),
            after: content.slice(blockEnd),
            newContent:
              content.slice(0, blockStart) + replace + content.slice(blockEnd),
          });
          newContent =
            content.slice(0, blockStart) + replace + content.slice(blockEnd);
          matches = 1;
          break;
        }
        case "line_range": {
          const { startLine, endLine, inclusive = true } = params;
          if (typeof startLine !== "number" || typeof endLine !== "number") {
            return {
              file,
              mode,
              matches: 0,
              success: false,
              error: "Missing required parameter: startLine or endLine",
            };
          }
          const lines = content.split("\n");
          const start = Math.max(0, startLine - 1);
          const end = inclusive ? endLine - 1 : endLine - 2;
          if (start >= 0 && end < lines.length && start <= end) {
            const numLines = end - start + 1;
            lines.splice(start, numLines, replace);
            newContent = lines.join("\n");
            matches = numLines;
          }
          break;
        }
      }

      if (matches > 0) {
        await fs.writeFile(file, newContent, { encoding: enc });
      }

      return {
        file,
        mode,
        matches,
        success: matches > 0,
        error: matches === 0 ? "No matches found" : undefined,
      };
    },
  })
);
