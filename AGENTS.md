# Annona Demo — Architecture Notes

## Current Architecture

- This is now a **two-agent demo slice**.
- The frontend keeps the two-panel comparison layout.
- The left panel runs the **ungrounded / raw** LangChain agent.
- The right panel runs the **grounded Annona** agent with built-in demo tools.

## Supported Today

- OpenAI and Anthropic model selection
- Streamed text responses
- Right-panel Annona demo snapshot tools for:
  - order margin lookup with freight and rebates
  - 30-day stockout risk checks
  - supplier margin leakage ranking
- Honest capability disclosure when the user asks for unsupported actions

## Not Supported Yet

- Live ERP / warehouse access
- Native web search
- Code sandbox execution
- File access or generated file downloads

The grounded panel uses a static bundled demo snapshot. It must not imply live operational access until real Annona integrations exist.

## Env Vars

| Var | Required | Notes |
| --- | --- | --- |
| `DEMO_PASSWORD` | Yes | API auth gate |
| `OPENAI_API_KEY` | Yes for OpenAI models | Required for default model |
| `ANTHROPIC_API_KEY` | Optional | Required only if Anthropic models are used |
