import { tool } from "ai";
import { z } from "zod";
import { requireConfirmation } from "./_confirmation";
import { withRender } from "./_framework";
import { spawn } from "child_process";

function isWindows() {
  return process.platform === "win32";
}

const OUTPUT_LIMIT = 8192; // 8k characters
const DEFAULT_TIMEOUT = 20000; // 20 seconds in ms

export const exec_command = withRender(
  tool({
    description:
      "Execute a shell command. Requires confirmation before running. Output is truncated to 8k characters (so add sorting/filtering/etc to reduce the output size, or put what you want to see in the top of the output). Default timeout is 20s. Does NOT support any interactive commands.",
    parameters: z.object({
      command: z.string().describe("The command to execute (e.g. 'ls')"),
      args: z
        .array(z.string())
        .optional()
        .describe("Arguments to pass to the command"),
      cwd: z
        .string()
        .optional()
        .describe("Working directory to run the command in"),
      env: z
        .record(z.string())
        .optional()
        .describe("Environment variables to set"),
      shell: z
        .boolean()
        .optional()
        .default(true)
        .describe("Run command in a shell (default true)"),
    }),
    async execute({ command, args = [], cwd, env, shell = true }) {
      const confirmed = await requireConfirmation(
        `Allow agent to execute: ${command} ${
          args && args.length ? args.join(" ") : ""
        }`
      );
      if (!confirmed) {
        return {
          command,
          args,
          success: false,
          error: "Command execution was disallowed by the user.",
        };
      }
      try {
        return await new Promise((resolve) => {
          const proc = spawn(command, args, {
            cwd,
            env: env ? { ...process.env, ...env } : process.env,
            shell,
          });
          let stdout = "";
          let stderr = "";
          let killedByTimeout = false;
          const timeout = setTimeout(() => {
            killedByTimeout = true;
            proc.kill();
          }, DEFAULT_TIMEOUT);
          proc.stdout?.on("data", (data) => {
            if (stdout.length < OUTPUT_LIMIT) {
              stdout += data.toString();
              if (stdout.length > OUTPUT_LIMIT) {
                stdout = stdout.slice(0, OUTPUT_LIMIT);
              }
            }
          });
          proc.stderr?.on("data", (data) => {
            if (stderr.length < OUTPUT_LIMIT) {
              stderr += data.toString();
              if (stderr.length > OUTPUT_LIMIT) {
                stderr = stderr.slice(0, OUTPUT_LIMIT);
              }
            }
          });
          proc.on("close", (exitCode) => {
            clearTimeout(timeout);
            const output = {
              command,
              args,
              cwd,
              env,
              shell,
              exitCode,
              stdout,
              stderr,
              success: exitCode === 0 && !killedByTimeout,
              error: killedByTimeout
                ? `Process killed after timeout of ${DEFAULT_TIMEOUT / 1000}s`
                : undefined,
              truncated: {
                stdout: stdout.length >= OUTPUT_LIMIT,
                stderr: stderr.length >= OUTPUT_LIMIT,
              },
            };
            if (debug) {
              console.debug(output);
            }
            resolve(output);
          });
          proc.on("error", (error) => {
            clearTimeout(timeout);
            const output = {
              command,
              args,
              cwd,
              env,
              shell,
              success: false,
              error: error?.message || String(error),
            };
            if (debug) {
              console.debug(output);
            }
            resolve(output);
          });
        });
      } catch (error: any) {
        const output = {
          command,
          args,
          cwd,
          env,
          shell,
          success: false,
          error: error?.message || String(error),
        };
        if (debug) {
          console.debug(output);
        }
        return output;
      }
    },
  }),
  undefined,
  ["cwd", "shell", "env"]
);
