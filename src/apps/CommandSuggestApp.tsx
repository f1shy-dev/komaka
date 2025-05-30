import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { streamText } from "ai";
import { buildCommandPrompt } from "../promptFramework";
import { registry, type ProviderName } from "../aiRegistry";
import { spawn } from "child_process";
export default function CommandSuggestApp({
  description,
  provider,
  modelId,
}: {
  description: string;
  provider?: ProviderName;
  modelId?: string;
}) {
  const [command, setCommand] = useState<string>("");
  const [_, setIsStreaming] = useState(true);
  const [status, setStatus] = useState<
    "stream" | "confirm" | "running" | "done"
  >("stream");
  const [runOutput, setRunOutput] = useState<string>("");

  // Start streaming suggestion
  useEffect(() => {
    (async () => {
      const chatModel = registry.languageModel(
        modelId && provider ? `${provider}:${modelId}` : "default:quick"
      );

      const prompt = await buildCommandPrompt(description);
      if (globalThis.debug) {
        console.log(prompt);
      }
      const result = streamText({
        model: chatModel,
        prompt,
      });

      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          setCommand((prev) => prev + part.textDelta);
        }
        if (part.type === "error") {
          console.error(part.error);
        }
      }

      setIsStreaming(false);
      setStatus("confirm");
    })();
  }, [description, provider, modelId]);

  // Handle user input for confirmation or exit
  useInput((input, key) => {
    if (status === "confirm") {
      if (input.toLowerCase() === "y") {
        runCommand();
      } else if (
        input.toLowerCase() === "n" ||
        key.escape ||
        (key.ctrl && input === "c")
      ) {
        process.exit(0);
      }
    }
  });

  const runCommand = () => {
    const [cmd, ...args] = command.split(" ");
    if (!cmd) return;

    const child = spawn(cmd, args, {
      shell: true,
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.on("exit", (code: number | null) => {
      process.exit(code ?? 0);
    });
    child.on("error", (err: Error) => {
      console.error("Failed to start command:", err);
      process.exit(1);
    });
  };

  return (
    <Box flexDirection="column">
      <Text color="green">Suggested command:</Text>
      <Text>{command}</Text>
      {status === "stream" && <Text dimColor>Thinking...</Text>}
      {status === "confirm" && <Text>Run this command? [y/n]</Text>}
      {status === "running" && <Text dimColor>Running command...</Text>}
    </Box>
  );
}
