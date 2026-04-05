## Shared native tool baseline

These files exist to demonstrate the shared baseline available to both panels in
the Annona demo:

- CSV / tabular dataset access
- web search when the provider supports it
- code execution when the provider supports it

The canonical product framing is that both panels start from the same uploaded
tabular baseline. In the current test harness, that baseline is represented by
static bundled demo files standing in for uploaded inputs.

Important limits:

- They are static demo assets bundled with the app.
- They are not live ERP, warehouse, or customer data.
- They are not a general local filesystem browser.
- They are an upload surrogate, not a finished end-user upload UX.

Bundled files in this shared baseline:

- `capability-baseline-notes.md`: this note.
- `global_freight_benchmarks.csv`: a small illustrative supply-chain benchmark table.
- `demo_order_margin_snapshot.csv`: a small illustrative order-margin table.
- `demo_order_margin_reference.md`: the worked margin formula and numbers.

Annona's differentiation is not hidden data access. It is the dataset-adaptive
orchestration layer applied on top of the same shared baseline.
