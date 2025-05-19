import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { withRender } from "./_framework";
import fs from "fs/promises";
import { Text } from "ink";
import React from "react";
// We will use a specific OpenAI model.
// As per aiRegistry.ts, openai("gpt-4.1-nano") is available.

export const edit_file = withRender(
  tool({
    description:
      "Applies an edit to a file. You should output a small diff saying what changed and any comments, then the AI will edit the file for you.",
    parameters: z.object({
      filePath: z
        .string()
        .describe("The path of the file that is being rewritten."),
      editInstructions: z
        .string()
        .describe("Detailed instructions on how to modify the file."),
    }),
    async execute({ filePath, editInstructions }) {
      let fileContent: string;
      try {
        fileContent = await fs.readFile(filePath, { encoding: "utf8" });
      } catch (err: any) {
        return {
          filePath,
          success: false,
          error:
            err?.code === "ENOENT"
              ? "File not found"
              : err?.message || "Unknown error",
        };
      }

      try {
        // Use the 'gpt-4.1-nano' model as specified in the user request and available in the registry.
        const model = openai("gpt-4.1-nano");

        const systemPrompt = `You are an expert code editor. Your task is to rewrite the entire file located at '\${filePath}' based on the provided original content and specific edit instructions.
You MUST output the complete, new content of the file. Do NOT output only the diffs or a summary of changes. Output the entire file content as it should be after applying the instructions.\`;

        const userPrompt = \`File Path: \${filePath}

Original File Content:
\`\`\`
\${originalContent}
\`\`\`

Edit Instructions:
\${editInstructions}

Please provide the complete new file content after applying these instructions.`;

        const { text, finishReason, usage } = await generateText({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: editInstructions,
            },

            {
              role: "user",
              content: fileContent,
            },
          ],
          providerOptions: {
            openai: {
              prediction: {
                type: "content",
                content: fileContent,
              },
            },
          },
        });

        let output;
        if (finishReason === "stop") {
          const fs = await import("fs/promises");
          await fs.writeFile(filePath, text, "utf8");
          const lineCountDiff =
            text.split("\n").length - fileContent.split("\n").length;

          output = {
            filePath,
            newContent: text,
            success: true,
            lineCountDiff,
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            },
          };
        } else {
          output = {
            filePath,
            success: false,
            error: `LLM agentic edit finished with reason: ${finishReason}`,
            partialContent: text,
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            },
          };
        }

        return output;
      } catch (error: any) {
        return {
          filePath,
          success: false,
          error: error?.message || String(error),
        };
      }
    },
  }),
  (result) => {
    if (result.success) {
      const lcdiff = result.lineCountDiff ? (
        <>
          {result.lineCountDiff} lines{" "}
          {result.lineCountDiff > 0 ? "added" : "removed"}
        </>
      ) : null;
      return (
        <Text color={"green"}>
          Generated new content for {result.filePath}. Tokens used:{" "}
          {result.usage?.totalTokens}. {lcdiff}
        </Text>
      );
    }
    return (
      <Text>
        Failed to generate content for {result.filePath}: {result.error}
      </Text>
    );
  }
);
