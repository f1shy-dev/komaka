#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import CommandSuggestApp from "./apps/CommandSuggestApp.js";
import QuestionApp from "./apps/QuestionApp";
import { ProviderNames, type ProviderName } from "./aiRegistry.js";

const cli = meow(
  `
	Usage
	  $ ai <c|command|q|question|a|agent> <text>

	Examples
	  $ ai c init new git repo here
	  $ ai q what is this error?
	  $ ai a read files in repo and then update the readme to be more helpful

	Options
		--provider  AI provider to use (openai|gemini|groq). Default: groq
		--model     Model ID to use
		--debug     Show debug information
		--yolo      Skip confirmation prompts
	`,
  {
    importMeta: import.meta,
    flags: {
      provider: {
        type: "string",
        default: "groq",
      },
      model: {
        type: "string",
      },
      debug: {
        type: "boolean",
        default: false,
      },
      yolo: {
        type: "boolean",
        default: false,
      },
    },
  }
);

if (cli.input.length < 2) {
  console.error("Error: Missing command type or text. See --help");
  cli.showHelp();
  process.exit(1);
}

const [type, ...rest] = cli.input as [string, ...string[]];
const text = rest.join(" ");
globalThis.debug = cli.flags.debug;
globalThis.yolo = cli.flags.yolo;
const selectedProvider = cli.flags.provider as ProviderName;
if (!ProviderNames.includes(selectedProvider)) {
  console.error(
    `Unknown provider "${selectedProvider}". Use one of: ${ProviderNames.join(
      ", "
    )}`
  );
  process.exit(1);
}
const modelId: string | undefined = cli.flags.model;
if (debug) {
  console.log(
    `Using provider: ${selectedProvider}, model: ${modelId}, debug: ${debug}`
  );
}

switch (type.toLowerCase()) {
  case "c":
  case "command":
    render(
      <CommandSuggestApp
        description={text}
        provider={selectedProvider}
        modelId={modelId}
      />
    );
    break;
  case "q":
  case "question":
    render(
      <QuestionApp
        question={text}
        provider={selectedProvider}
        modelId={modelId}
      />
    );
    break;
  case "a":
  case "agent":
    render(
      <QuestionApp
        question={text}
        provider={selectedProvider}
        modelId={modelId}
        agent
      />
    );
    break;
  default:
    console.error(
      `Unknown type "${type}". Use 'c'/'command' or 'q'/'question'.`
    );
    process.exit(1);
}
