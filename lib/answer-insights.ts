import type { ToolInvocation } from "@/hooks/useStreamingChat";

export interface AnswerEvidenceItem {
  label: string;
  sourceLabel: string;
  detail: string;
}

export interface AnswerConfidence {
  label: "High" | "Medium" | "Low";
  summary: string;
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
    };
  }

  if (typeof result.disclosure === "string" && typeof result.snapshot_id === "string") {
    return {
      label: "Grounding scope",
      sourceLabel: "Annona snapshot",
      detail: truncate(result.disclosure, 110),
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

  if (annonaTools.length > 0) {
    score += 0.26;
  }

  if (nativeTools.length > 0) {
    score += 0.12;
  }

  if (evidence.length >= 2) {
    score += 0.08;
  }

  if (
    lowerContent.includes("may ") ||
    lowerContent.includes("might ") ||
    lowerContent.includes("could ") ||
    lowerContent.includes("likely")
  ) {
    score -= 0.12;
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
        annonaTools.length > 0
          ? "Grounded on structured Annona results with supporting evidence."
          : "Backed by multiple supporting tool results.",
    };
  }

  if (boundedScore >= 0.56) {
    return {
      label: "Medium",
      summary:
        successfulTools.length > 0
          ? "Supported by some tool output, but parts of the answer remain interpretive."
          : "Reasonable answer, but the grounding trail is limited.",
    };
  }

  return {
    label: "Low",
    summary: "The answer is lightly supported and should be verified before acting on it.",
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
