import type { ToolInvocation } from "@/hooks/useStreamingChat";

export interface AnswerEvidenceItem {
  label: string;
  sourceLabel: string;
  detail: string;
  stateLabel?: "Observed" | "Estimated" | "Wobble";
  tone?: "neutral" | "warning";
}

export interface AnswerConfidence {
  label: "High" | "Medium" | "Low";
  summary: string;
  stateLabel: "Observed" | "Estimated";
}

export interface AnswerInsights {
  confidence: AnswerConfidence;
  evidence: AnswerEvidenceItem[];
  caveats: string[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatCurrency(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: unknown, noun: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = value > 0 && value <= 1 ? value * 100 : value;
  const rounded = normalized >= 10 ? Math.round(normalized) : Number(normalized.toFixed(1));

  return `${rounded}%`;
}

function truncate(value: string, max = 120) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function humanizeToolName(toolName: string) {
  return toolName
    .replace(/^openai_/, "OpenAI ")
    .replace(/^annona_/, "Annona ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeValue(value: string) {
  return value.replace(/_/g, " ");
}

function extractLogs(result: JsonRecord) {
  const outputs = result.outputs;
  if (!Array.isArray(outputs)) {
    return null;
  }

  const logOutput = outputs.find(
    (output) =>
      isRecord(output) &&
      (typeof output.logs === "string" || typeof output.content === "string"),
  );

  if (!isRecord(logOutput)) {
    return null;
  }

  const content =
    typeof logOutput.logs === "string"
      ? logOutput.logs
      : typeof logOutput.content === "string"
        ? logOutput.content
        : null;

  return content ? truncate(content.replace(/\s+/g, " ")) : null;
}

function evidenceFromResult(
  toolName: string,
  result: unknown,
): AnswerEvidenceItem | null {
  if (!isRecord(result)) {
    return null;
  }

  if (toolName === "openai_file_search") {
    const results = Array.isArray(result.results) ? result.results : [];
    const filenames = results
      .map((item) =>
        isRecord(item) && typeof item.filename === "string" ? item.filename : "",
      )
      .filter(Boolean)
      .slice(0, 3);

    if (filenames.length === 0) {
      return null;
    }

    return {
      label: "Reference files",
      sourceLabel: "Shared bundle",
      detail: filenames.join(", "),
    };
  }

  if (toolName === "openai_code_interpreter") {
    const logs = extractLogs(result);
    if (!logs) {
      return null;
    }

    return {
      label: "Sandbox calculation",
      sourceLabel: "OpenAI code",
      detail: logs,
    };
  }

  if (toolName === "openai_web_search") {
    const action = isRecord(result.action) ? result.action : null;
    const queries = Array.isArray(action?.queries)
      ? action?.queries.filter((value): value is string => typeof value === "string")
      : [];
    const query = queries[0];

    if (!query) {
      return null;
    }

    return {
      label: "External lookup",
      sourceLabel: "OpenAI web",
      detail: truncate(query, 90),
    };
  }

  if (
    result.traceability_mode === "probabilistic" &&
    typeof result.estimated_state === "string"
  ) {
    const progressMid = formatPercent(result.inferred_progress_pct);
    const progressLow = formatPercent(result.progress_pct_low);
    const progressHigh = formatPercent(result.progress_pct_high);
    const progressBand =
      progressLow && progressHigh
        ? `${progressLow}-${progressHigh} inferred progress`
        : progressMid
          ? `${progressMid} inferred progress`
          : null;
    const coverage = formatPercent(result.evidence_coverage_pct);
    const wobble =
      result.wobble_detected === true
        ? "wobble detected"
        : typeof result.wobble_flag === "string" &&
            result.wobble_flag !== "stable"
          ? `wobble ${humanizeValue(result.wobble_flag)}`
          : null;

    return {
      label: result.wobble_detected === true ? "Wobble alert" : "Estimated progress",
      sourceLabel: "Annona heuristic",
      stateLabel: result.wobble_detected === true ? "Wobble" : "Estimated",
      tone: result.wobble_detected === true ? "warning" : "neutral",
      detail: [
        humanizeValue(result.estimated_state),
        progressBand,
        coverage ? `${coverage} signal coverage` : null,
        wobble,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }

  if (Array.isArray(result.orders)) {
    const orderCount =
      formatCount(result.total_orders, "order") ??
      formatCount(result.orders.length, "order") ??
      "snapshot rows";
    const netMargin = formatCurrency(result.net_margin);
    const marginPct =
      typeof result.margin_pct === "number" ? `${result.margin_pct}% margin` : null;

    return {
      label: "Order snapshot",
      sourceLabel: "Annona snapshot",
      detail: [orderCount, netMargin, marginPct].filter(Boolean).join(" | "),
      stateLabel: "Observed",
    };
  }

  if (Array.isArray(result.skus)) {
    const skuCount =
      formatCount(result.exception_count, "SKU") ??
      formatCount(result.skus.length, "SKU") ??
      "stock exceptions";
    const urgentCount = formatCount(result.urgent_count, "urgent");

    return {
      label: "Stock risk rows",
      sourceLabel: "Annona snapshot",
      detail: [skuCount, urgentCount].filter(Boolean).join(" | "),
      stateLabel: "Observed",
    };
  }

  if (Array.isArray(result.suppliers)) {
    const topSupplier =
      typeof result.supplier === "string" ? result.supplier : "Top supplier";
    const leakage = formatCurrency(result.leakage_amount);

    return {
      label: "Leakage ranking",
      sourceLabel: "Annona snapshot",
      detail: [topSupplier, leakage].filter(Boolean).join(" | "),
      stateLabel: "Observed",
    };
  }

  if (typeof result.disclosure === "string" && typeof result.snapshot_id === "string") {
    return {
      label: "Grounding scope",
      sourceLabel: "Annona snapshot",
      detail: truncate(result.disclosure, 110),
      stateLabel: "Observed",
    };
  }

  if (
    typeof result.net_margin === "number" ||
    typeof result.margin_pct === "number" ||
    typeof result.days_remaining === "number"
  ) {
    const fragments = [
      formatCurrency(result.net_margin),
      typeof result.margin_pct === "number" ? `${result.margin_pct}% margin` : null,
      typeof result.days_remaining === "number"
        ? `${result.days_remaining} days remaining`
        : null,
    ].filter(Boolean);

    if (fragments.length > 0) {
      return {
        label: humanizeToolName(toolName),
        sourceLabel: toolName.startsWith("annona_") ? "Annona tool" : "Tool output",
        detail: fragments.join(" | "),
        stateLabel: toolName.startsWith("annona_") ? "Observed" : undefined,
      };
    }
  }

  if (typeof result.weakest_row === "string") {
    const netMargin = formatCurrency(result.weakest_row_net_margin);
    const marginPct =
      typeof result.weakest_row_margin_pct === "number"
        ? `${result.weakest_row_margin_pct}% margin`
        : null;

    return {
      label: "Blocking row",
      sourceLabel: "Annona analysis",
      detail: [result.weakest_row, netMargin, marginPct].filter(Boolean).join(" | "),
      stateLabel: "Observed",
    };
  }

  if (typeof result.top_watchpoint === "string") {
    const reliability =
      typeof result.reliability_pct === "number"
        ? `${result.reliability_pct}% reliability`
        : null;
    const transit =
      typeof result.transit_days === "number"
        ? `${result.transit_days} transit days`
        : null;
    const cost = formatCurrency(result.cost_usd);

    return {
      label: "Early warning signal",
      sourceLabel: "Annona analysis",
      detail: [
        result.top_watchpoint,
        typeof result.carrier_family === "string" ? result.carrier_family : null,
        transit,
        reliability,
        cost,
      ]
        .filter(Boolean)
        .join(" | "),
      stateLabel: "Observed",
    };
  }

  if (typeof result.priority === "string" || typeof result.next_action === "string") {
    return {
      label: "Priority and next step",
      sourceLabel: "Annona analysis",
      detail: [
        typeof result.priority === "string" ? result.priority : null,
        typeof result.next_action === "string" ? result.next_action : null,
      ]
        .filter(Boolean)
        .join(" | "),
      stateLabel: "Observed",
    };
  }

  return null;
}

function collectCaveats(content: string, toolInvocations: ToolInvocation[]) {
  const caveats: string[] = [];
  const normalizedContent = content.toLowerCase();

  if (
    normalizedContent.includes("if ") ||
    normalizedContent.includes("next week") ||
    normalizedContent.includes("recommend") ||
    normalizedContent.includes("should ")
  ) {
    caveats.push(
      "Recommended actions are directional and should be checked against live operational state before execution.",
    );
  }

  if (
    normalizedContent.includes("may ") ||
    normalizedContent.includes("might ") ||
    normalizedContent.includes("could ") ||
    normalizedContent.includes("likely")
  ) {
    caveats.push("Parts of the answer are probabilistic rather than fully certain.");
  }

  for (const invocation of toolInvocations) {
    const result = invocation.result;
    if (!isRecord(result)) {
      continue;
    }

    if (Array.isArray(result.caveats)) {
      for (const caveat of result.caveats) {
        if (typeof caveat === "string") {
          caveats.push(caveat);
        }
      }
    }

    if (
      result.traceability_mode === "probabilistic" ||
      result.point_of_use_data_status === "missing" ||
      result.missing_point_of_use_data === true
    ) {
      caveats.push(
        "Point-of-use confirmation is missing, so the grounded state is estimated from indirect signals rather than exact scan truth.",
      );
    }

    if (result.wobble_detected === true) {
      caveats.push(
        "Wobble indicates the inferred progress direction is unstable and needs manual confirmation before execution.",
      );
    }

    if (typeof result.disclosure === "string") {
      caveats.push(result.disclosure);
      continue;
    }

    if (invocation.toolName.startsWith("annona_")) {
      caveats.push(
        "Grounded on the bundled Annona demo snapshot and shared files, not live ERP or warehouse data.",
      );
      continue;
    }
  }

  return [...new Set(caveats)].slice(0, 3);
}

function buildConfidence(
  content: string,
  toolInvocations: ToolInvocation[],
  evidence: AnswerEvidenceItem[],
): AnswerConfidence {
  let score = 0.44;
  const successfulTools = toolInvocations.filter(
    (invocation) =>
      invocation.result !== undefined &&
      (!isRecord(invocation.result) || typeof invocation.result.error !== "string"),
  );
  const annonaTools = successfulTools.filter((invocation) =>
    invocation.toolName.startsWith("annona_"),
  );
  const nativeTools = successfulTools.filter((invocation) =>
    invocation.toolName.startsWith("openai_"),
  );
  const lowerContent = content.toLowerCase();
  const probabilisticTraceability = successfulTools.some(
    (invocation) =>
      isRecord(invocation.result) &&
      (invocation.result.traceability_mode === "probabilistic" ||
        invocation.result.point_of_use_data_status === "missing"),
  );
  const wobbleDetected = successfulTools.some(
    (invocation) =>
      isRecord(invocation.result) && invocation.result.wobble_detected === true,
  );
  const stateLabel = probabilisticTraceability ? "Estimated" : "Observed";

  if (annonaTools.length > 0) {
    score += 0.26;
  }

  if (nativeTools.length > 0) {
    score += 0.12;
  }

  if (evidence.length >= 2) {
    score += 0.08;
  }

  if (probabilisticTraceability) {
    score -= 0.08;
  }

  if (wobbleDetected) {
    score -= 0.1;
  }

  if (
    lowerContent.includes("may ") ||
    lowerContent.includes("might ") ||
    lowerContent.includes("could ") ||
    lowerContent.includes("likely")
  ) {
    score -= probabilisticTraceability ? 0.04 : 0.12;
  }

  if (successfulTools.length === 0) {
    score -= 0.18;
  }

  if (
    toolInvocations.some(
      (invocation) =>
        isRecord(invocation.result) && typeof invocation.result.error === "string",
    )
  ) {
    score -= 0.18;
  }

  const boundedScore = Math.min(0.96, Math.max(0.12, score));

  if (boundedScore >= 0.78) {
    return {
      label: "High",
      summary:
        probabilisticTraceability
          ? "Backed by structured heuristic signals, but still estimated because point-of-use confirmation is missing."
          : annonaTools.length > 0
            ? "Grounded on structured Annona results with supporting evidence."
            : "Backed by multiple supporting tool results.",
      stateLabel,
    };
  }

  if (boundedScore >= 0.56) {
    return {
      label: "Medium",
      summary:
        probabilisticTraceability
          ? "Supported by heuristic signals, but the operational state remains estimated rather than confirmed at point of use."
          : successfulTools.length > 0
            ? "Supported by some tool output, but parts of the answer remain interpretive."
            : "Reasonable answer, but the grounding trail is limited.",
      stateLabel,
    };
  }

  return {
    label: "Low",
    summary: probabilisticTraceability
      ? "The state is inferred from sparse or unstable signals and should be manually verified before acting on it."
      : "The answer is lightly supported and should be verified before acting on it.",
    stateLabel,
  };
}

export function deriveAnswerInsights(
  content: string,
  toolInvocations: ToolInvocation[],
): AnswerInsights {
  const evidence = toolInvocations
    .filter((invocation) => invocation.toolName !== "__output_file__")
    .map((invocation) => evidenceFromResult(invocation.toolName, invocation.result))
    .filter((item): item is AnswerEvidenceItem => item !== null)
    .slice(0, 3);
  const caveats = collectCaveats(content, toolInvocations);

  return {
    confidence: buildConfidence(content, toolInvocations, evidence),
    evidence,
    caveats,
  };
}
