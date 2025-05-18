import React, { lazy, useEffect, useState } from "react";
import { Box, Text } from "ink";
import { streamText, type TextStreamPart } from "ai";
import { registry, type ProviderName } from "../aiRegistry";
import Markdown from "@inkkit/ink-markdown";
import { buildQuestionAssistantPrompt } from "../promptFramework";
import { toolKit, weatherTool, type ToolKit } from "../tools/_framework";

export default function QuestionApp({
  question,
  provider,
  modelId,
  agent,
}: {
  question: string;
  provider?: ProviderName;
  modelId?: string;
  agent?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [parts, setParts] = useState<TextStreamPart<ToolKit>[]>([]);

  useEffect(() => {
    (async () => {
      const model = registry.languageModel(
        modelId && provider
          ? `${provider}:${modelId}`
          : agent
          ? "default:agent"
          : "default:normal"
      );
      const prompt = await buildQuestionAssistantPrompt(question, agent);
      if (debug) {
        console.log(prompt);
      }
      const result = streamText({
        maxSteps: 10,
        model,
        prompt,
        onError: (error) => {
          console.error(error);
        },
        tools: Object.fromEntries(
          Object.entries(toolKit()).map(([key, tool]) => [key, tool.tool])
        ),
      });
      for await (const part of result.fullStream) {
        // setParts((prev) => [...prev, part as TextStreamPart<ToolKit>]);
        if (part.type === "text-delta") {
          setParts((prev) => {
            const lastPart = prev?.[prev.length - 1];
            if (lastPart && lastPart.type === "text-delta") {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastPart,
                  textDelta: lastPart.textDelta + part.textDelta,
                },
              ];
            }

            return [...prev, part];
          });
        } else {
          setParts((prev) => [...prev, part as TextStreamPart<ToolKit>]);
        }
      }
    })();
  }, [question, provider, modelId]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {parts.map((part, index) => {
        switch (part.type) {
          case "text-delta":
            return <Markdown key={index}>{part.textDelta}</Markdown>;
          case "tool-result":
            const render = toolKit()[part.toolName as keyof ToolKit].render;
            const hideArgs = toolKit()[part.toolName as keyof ToolKit].hideArgs;
            let formatted = Object.entries(part.args)
              .filter(
                ([key]) => !(hideArgs as string[])?.includes(key.toString())
              )
              .map(([key, value]) => `${key}=${value}`)
              .join(", ");
            return (
              <Box key={index} flexDirection="column">
                <Text color="gray"> {`${part.toolName}(${formatted})`}</Text>
                {render && <Text>{render(part.result as any)}</Text>}
              </Box>
            );
          case "error":
            return <Text key={index}>{JSON.stringify(part)}</Text>;
          default:
            return null;
        }
      })}
    </Box>
  );
}
