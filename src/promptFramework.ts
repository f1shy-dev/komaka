import os from "os";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { execa } from "execa";
import { list_directory } from "./tools/filesystem";
import { toolKit } from "./tools/_framework";

function gitStatusWithTimeout(cwd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("Unavailable (timeout)"), timeoutMs);
    exec("git status", { cwd }, (error, stdout) => {
      clearTimeout(timer);
      if (error) {
        resolve("Unavailable (not a git repo)");
      } else {
        resolve(stdout.trim() || "Clean");
      }
    });
  });
}

async function buildSystemContext(): Promise<string> {
  if (globalThis.debug) {
    console.time("PromptFramework.buildSystemContext");
  }
  const cwd = process.cwd();
  const platform = os.platform();
  const arch = os.arch();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const now = new Date().toString();
  const ls = await list_directory.tool.execute(
    { dir: cwd, recursive_depth: 1, includeVcAndPkgDirs: false },
    { toolCallId: "ls", messages: [] }
  );
  const sub = ls.files.length - 75;
  const ls_disclaimer = `\n<warn note="There are ${sub} more files in this folder! Use list_directory if you need to know the full list." />`;

  let diskFree = "Unknown";

  try {
    const stat = await fs.statfs(cwd);
    diskFree = `${Math.round((stat.bavail * stat.bsize) / 1024 / 1024)} MB`;
  } catch {
    diskFree = "Unavailable in Node.js";
  }

  const location = "Unknown";

  const gitStatus = await gitStatusWithTimeout(cwd, 150);

  if (globalThis.debug) {
    console.timeEnd("PromptFramework.buildSystemContext");
  }
  return [
    `Current folder: ${cwd}`,
    `OS: ${platform} (${arch})`,
    `Free memory: ${Math.round(freeMem / 1024 / 1024)} MB / ${Math.round(
      totalMem / 1024 / 1024
    )} MB`,
    `Free disk space: ${diskFree}`,
    `Current time: ${now}`,
    `Location: ${location}`,
    `<git-status>
${gitStatus}
</git-status>`.trim(),
    ls.success &&
      `<optimistic_list_directory_tool depth=2 dir="${
        ls.dir
      }" vc_and_pkg_dirs=false first_n=75>
${ls.files.slice(0, 75).join("\n")}${ls.files.length > 75 ? ls_disclaimer : ""}
</optimistic_list_directory_tool>`.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function buildCommandPrompt(description: string): Promise<string> {
  const context = await buildSystemContext();
  return `You are an AI assistant generating shell commands for a user.

<context>
${context}
</context>

Task: Generate the shell command to ${description}. Only output the command. Do not add explanations.`;
}

export async function buildQuestionAssistantPrompt(
  question: string,
  agent?: boolean
): Promise<string> {
  const context = await buildSystemContext();
  //   Prefer the edit_file_segment tool over write_file, as it is more powerful and can handle more complex edits, while being cheaper.
  if (agent) {
    return `You are Komaka (こまか, 細か) meaning "fine," "detailed," or "precise" in Japanese. - a highly skilled software engineer agent with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use. The user is interacting with you via the terminal. Treat the user message like a task which YOU need to accomplish.

However the user is not currently able to chat back with you if you need to ask them for more information. So unless their goal is very very unclear, you should try to use tools and your own knowledge to accomplish their goal as best you can without any further clarification.

You are suggested to always read files before modifying their content, such that you can understand the context of the file and its contents before making any changes haphazardly. Never assume a file just exists, always run some tools to check it's existance/etc. Use edit_file to partially edit files, or write_file to overwrite the whole file/create a new one.

If editing a file in the current folder, make sure to prefix the file path with "./" to indicate it's a relative path.
You can execute command line shell commands with the exec_command tool. If the user asks you to do something that requires a command line shell command, use the exec_command tool to do it - do not just tell them or write the command in the terminal. Be smart about commands - process the OS the user is on and remember that some commands may be different on different OSes, and there may be better ways to do a certain task for each OS too.

If the user gives a command/action/verb to do or something, often they mean in context of the current folder. So don't just start giving generic advice - always first check your surroundings.

If you mkdir and are going to work in that directory, use the cd tool to change to that directory. Use bun as default javascript package manager, unless the user specifies otherwise (or there are lockfiles for other package managers in the folder).

Never ask "Would you like me", just DO IT.

Available tools:
${Object.entries(toolKit())
  .map(([key, tool]) => `${key}: ${tool.tool.description}`)
  .join("\n")}
 
<context>
${context}
</context>

Task: Answer the following question as concisely and helpfully as possible:

${question}`;
  }

  return `You are an AI assistant inside the user's terminal helping a user with general ortechnical questions.

<context>
${context}
</context>

Task: Answer the following question as concisely and helpfully as possible:

${question}`;
}
