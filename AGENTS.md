# Supplie Demo — Architecture Notes

## Current Architecture

- This is currently a **single-backend slice**.
- The frontend keeps the two-panel comparison layout.
- Both panels render the same shared LangChain session.
- The backend represents the **ungrounded** agent from the demo design.

## Supported Today

- OpenAI and Anthropic model selection
- Streamed text responses
- Honest capability disclosure when the user asks for unsupported actions

## Not Supported Yet

- Native web search
- Code sandbox execution
- File access or generated file downloads

These capabilities should stay disabled in UI and backend code until real tool implementations exist.

## Env Vars

| Var | Required | Notes |
| --- | --- | --- |
| `DEMO_PASSWORD` | Yes | API auth gate |
| `OPENAI_API_KEY` | Yes for OpenAI models | Required for default model |
| `ANTHROPIC_API_KEY` | Optional | Required only if Anthropic models are used |
