# Structured Logging

The app emits structured JSON logs to stdout/stderr so local runs, dev EKS pods, and GitHub Actions deploy jobs can all be inspected with the same fields.

## What Is Logged

- Every API request logs `api_request_started` and either `api_request_completed`, `api_request_failed`, `api_request_rejected`, or `api_request_rate_limited`.
- Every model execution logs `model_run_started` and either `model_run_completed` or `model_run_failed`.
- Tool usage logs `tool_call_started`, `tool_call_completed`, and `tool_call_failed`.
- Capability state logs `capability_snapshot` with `supported_capabilities` and `unsupported_capabilities`.
- OpenAI bundle/bootstrap paths log whether the shared file/vector-store bundle was reused, created, or failed.

Each log line includes:

- `timestamp`
- `service`
- `level`
- `event`
- `requestId`
- `traceId`
- request context such as `route`, `method`, `provider`, `agentMode`, `model`, and `backend` when available

## Request And Trace IDs

- Incoming `x-request-id`, `x-correlation-id`, `traceparent`, `x-trace-id`, and `x-b3-traceid` headers are reused when present.
- If no IDs are supplied, the server generates them.
- API responses include `X-Request-Id` and `X-Trace-Id` headers so callers can correlate client failures with server logs.

## Redaction Rules

- Keys containing `api_key`, `authorization`, `cookie`, `credential`, `password`, `secret`, or `token` are logged as `[REDACTED]`.
- Known token formats such as `Bearer ...`, `sk-...`, `sk-ant-...`, and GitHub personal access token prefixes are redacted even when they appear inside larger payloads.
- Request logs avoid raw prompt bodies and passwords. They log counts, sizes, and capability state instead.

## Local Usage

Run the app normally:

```bash
npm install
export DEMO_PASSWORD=local-demo-password
export OPENAI_API_KEY=sk-...
npm run dev
```

Then inspect logs:

```bash
npm run dev | jq
```

If `jq` is not installed, plain stdout still contains one JSON object per line.

## Dev EKS Usage

Recent logs from the dev deployment:

```bash
kubectl logs deployment/supplie-demo -n supplie-dev --tail=80
```

Filter to a specific request or trace:

```bash
kubectl logs deployment/supplie-demo -n supplie-dev | jq 'select(.requestId=="<request-id>")'
kubectl logs deployment/supplie-demo -n supplie-dev | jq 'select(.traceId=="<trace-id>")'
```

## Deploy Diagnostics

Both GitHub Actions deploy workflows now:

- print a small cluster snapshot after kubeconfig setup
- print recent application logs after a successful rollout
- collect `kubectl describe`, pod logs, previous pod logs, services, ingress, and events on failure with `scripts/collect-k8s-diagnostics.sh`
