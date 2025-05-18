import readline from "readline";
import chalk from "chalk";

export async function requireConfirmation(message: string): Promise<boolean> {
  if (globalThis.yolo) {
    return true;
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${chalk.yellow(message)} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
