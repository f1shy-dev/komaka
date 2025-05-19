# komaka

"Komaka" (こまか, 細か) means "fine," "detailed," or "precise" in Japanese.

komaka is a lightweight, fast, and versatile command-line AI assistant built with Bun, AI SDK, and React Ink. It helps users generate shell commands, answer questions, and perform complex tasks using AI models from multiple providers.

## Features

- Generate shell commands from natural language descriptions.
- Ask general or technical questions and get concise AI-generated answers.
- Use an advanced agent mode for step-by-step task completion with tool access.
- Supports multiple AI providers: OpenAI, Google, Groq (via [AI SDK](https://ai-sdk.dev/)).
- Context-aware prompts using system information like current directory, OS, memory, disk space, and git status.
- Advanced file editing capabilities with find/replace, block markers, and line ranges.

## Usage
```bash
git clone https://github.com/f1shy-dev/komaka
cd komaka
bun install
bun run build

bun dist/index.js <type> <text> [options]
# or
bun link
komaka <type> <text> [options]
```

Setup your .env in `$HOME/.config/komaka/.env`:
```
OPENAI_API_KEY=...
GROQ_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### For everyday use
```
echo 'alias aic="komaka agent"' >> ~/.bashrc
echo 'alias aiq="komaka question"' >> ~/.bashrc
echo 'alias aic="komaka command"' >> ~/.bashrc

aic install ffmpeg
aia biggest files here
aia convert the jpegs to pngs inside a folder 'new_output'
aia compress the promo mp4 for social media
```

Where `<type>` is one of:
- `c` or `command`: Generate shell commands.
- `q` or `question`: Ask a question.
- `a` or `agent`: Use the advanced agent mode (all the tools!).

Examples:

```bash
komaka c init new git repo here
komaka q what is this error?
komaka a read files in repo and then update the readme to be more helpful
komaka agent implement a simple api with hono in ./project-3 with a weather endpoint using open meteo and some health apis too - use bun
```

Options:
- `--provider`: AI provider to use (`openai`, `google`, `groq`). Default is `groq`.
- `--model`: Specify the model ID to use.
- `--debug`: Show debug information.
- `--yolo`: Skip confirmation prompts.
