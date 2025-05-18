import { createProviderRegistry, customProvider } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

export const registry = createProviderRegistry({
  openai,
  google,
  groq,

  default: customProvider({
    languageModels: {
      agent: openai("gpt-4.1-mini"),
      normal: openai("gpt-4.1-nano"),
      quick: groq("llama-3.1-8b-instant"),
    },
  }),
});

export const ProviderNames = ["openai", "google", "groq", "default"] as const;
export type ProviderName = (typeof ProviderNames)[number];
