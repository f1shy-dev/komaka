import os from "os";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { execa } from "execa";

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
  const ls = await execa("ls", { cwd });

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
    `<ls>
${ls.stdout.split("\n").join("  ")}
</ls>`.trim(),
  ].join("\n");
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
  if (agent) {
    return `You are Agent, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use. The user is interacting with you via the terminal.

However the user is not currently able to chat back with you if you need to ask them for more information. So unless their goal is very very unclear, you should try to use tools and your own knowledge to accomplish their goal as best you can without any further clarification.

You are suggested to always read files before modifying their content, such that you can understand the context of the file and its contents before making any changes haphazardly.
 
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
