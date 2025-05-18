# komaka

"Komaka" (こまか, 細か) means "fine," "detailed," or "precise" in Japanese.

komaka is a lightweight, fast, and versatile command-line AI assistant built with Bun and React Ink. It helps users generate shell commands, answer questions, and perform complex tasks using AI models from multiple providers.

## Features

- Generate shell commands from natural language descriptions.
- Ask general or technical questions and get concise AI-generated answers.
- Use an advanced agent mode for step-by-step task completion with tool access.
- Supports multiple AI providers: OpenAI, Google, Groq.
- Context-aware prompts using system information like current directory, OS, memory, disk space, and git status.

## Installation

Install dependencies:

```bash
bun install
```

## Usage

Run the CLI with the following syntax:

```bash
bun run index.ts <type> <text> [options]
```

Where `<type>` is one of:
- `c` or `command`: Generate shell commands.
- `q` or `question`: Ask a question.
- `a` or `agent`: Use the advanced agent mode.

Examples:

```bash
bun run index.ts c init new git repo here
bun run index.ts q what is this error?
bun run index.ts a read files in repo and then update the readme to be more helpful
```

Options:
- `--provider`: AI provider to use (`openai`, `google`, `groq`). Default is `groq`.
- `--model`: Specify the model ID to use.
- `--debug`: Show debug information.
- `--yolo`: Skip confirmation prompts.

## Source Files

- `src/index.tsx`: CLI entry point.
- `src/aiRegistry.ts`: AI provider registry.
- `src/promptFramework.ts`: Builds context-aware prompts.
- `src/apps/CommandSuggestApp.tsx`: Command suggestion UI.
- `src/apps/QuestionApp.tsx`: Question answering UI.

## Notes

This project leverages Bun for fast runtime and React Ink for terminal UI components. It is designed to be a helpful, context-aware AI assistant in the terminal.

---

Feel free to explore and extend komaka to suit your AI assistant needs!