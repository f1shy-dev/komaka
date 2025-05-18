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
      return { dir: resolved, files, success: true };
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
