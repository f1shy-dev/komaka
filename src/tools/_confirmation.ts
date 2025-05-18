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
      // Clear the prompt line after answering
      readline.moveCursor(process.stdout, 0, -1); // Move up one line
      readline.clearLine(process.stdout, 0); // Clear the line
      readline.cursorTo(process.stdout, 0); // Move cursor to start
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
