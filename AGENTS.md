# Supplie Demo — Architecture Notes

## Tools Comparison (correct architecture as of 2026-03-23)

This is a **tools comparison** demo, NOT a model comparison.

- User picks ONE model (GPT or Claude)
- **LEFT panel** — same model + code execution only (no grounded tools)
- **RIGHT panel** — same model + all 6 grounded tools + code execution
- Same prompt, same data, different capabilities

The comparison shows: _ungrounded sandbox reasoning_ vs _grounded tool-augmented reasoning_

## Providers

- **OpenAI** — GPT-5.4 mini (default), GPT-5.4 full
  - Left panel uses Responses API + Code Interpreter
  - Right panel uses AI SDK streamText + 6 grounded tools
- **Anthropic** — Claude Sonnet 4.6 (requires ANTHROPIC_API_KEY)
  - Left panel: Messages API + code_execution_20250825
  - Right panel: AI SDK streamText (anthropic provider) + 6 grounded tools
  - Key to be provided by Rich Docherty

## Env Vars

| Var                   | Required | Notes                                                 |
| --------------------- | -------- | ----------------------------------------------------- |
| OPENAI_API_KEY        | ✓        | Always required                                       |
| DEMO_PASSWORD         | ✓        | Auth gate                                             |
| ANTHROPIC_API_KEY     | Optional | Claude models; 503 if missing                         |
| OPENAI_CSV_FILE_ID    | Optional | Pre-uploaded orders.csv; falls back to CSV-in-context |
| ANTHROPIC_CSV_FILE_ID | Optional | Pre-uploaded orders.csv; falls back to CSV-in-context |

## File Upload (optional but recommended for production)

Upload orders.csv once to get persistent file IDs:

```bash
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/upload-files.ts
```

Then set `OPENAI_CSV_FILE_ID` and `ANTHROPIC_CSV_FILE_ID` in Vercel dashboard.

## Auth

`/api/config` and `/api/files/download` are excluded from the Bearer token middleware (public endpoints).
All other `/api/*` routes require `Authorization: Bearer <DEMO_PASSWORD>`.
