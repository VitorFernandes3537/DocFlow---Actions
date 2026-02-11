import { CONDITIONAL_TERMS, type ExtractionItem } from "@/lib/types";
import { containsRelativeDateExpression, resolveRelativeDates } from "@/lib/relative-dates";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compactText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function hasSufficientText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length < 180) {
    return false;
  }

  const tokens = normalized.match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  if (tokens.length < 35) {
    return false;
  }

  const uniqueTokens = new Set(tokens.map((token) => token.toLowerCase()));
  if (uniqueTokens.size < 18) {
    return false;
  }

  const alphaNumChars = normalized.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return alphaNumChars / normalized.length > 0.25;
}

export function includesConditionalLanguage(text: string) {
  const normalized = normalizeText(text);
  return CONDITIONAL_TERMS.some((term) => normalized.includes(term));
}

function ensureConditionalRules(item: ExtractionItem): ExtractionItem {
  const joined = `${item.title} ${item.description} ${item.evidence_snippet}`;
  const hasConditional = includesConditionalLanguage(joined);

  const next: ExtractionItem = {
    ...item,
    description: compactText(item.description),
    due_date_raw: compactText(item.due_date_raw) || null,
    conditional: item.conditional || hasConditional,
    dependencies: Array.isArray(item.dependencies) ? item.dependencies : []
  };

  if (next.conditional && next.dependencies.length === 0) {
    next.dependencies = ["Possui clausula condicional no texto-fonte."];
  }

  return next;
}

function pushUniqueDependency(item: ExtractionItem, text: string) {
  const normalizedTarget = normalizeText(text);
  const hasSame = item.dependencies.some((dependency) => normalizeText(dependency) === normalizedTarget);
  if (!hasSame) {
    item.dependencies = [...item.dependencies, text];
  }
}

function upgradeConfidenceIfResolved(item: ExtractionItem) {
  if (item.confidence === "uncertain") {
    item.confidence = "low";
  }
}

function markUncertainIfUnresolvedRelative(item: ExtractionItem, anchorText: string | null) {
  item.due_date = null;
  item.confidence = "uncertain";

  if (anchorText) {
    pushUniqueDependency(item, `Referencia temporal nao resolvida automaticamente: ${anchorText}`);
  } else {
    pushUniqueDependency(item, "Referencia temporal relativa nao resolvida automaticamente.");
  }
}

export function normalizeItems(items: ExtractionItem[], baseDate: string | null) {
  const prepared = items.map((item) => ensureConditionalRules(item));
  const resolved = resolveRelativeDates(prepared, baseDate);

  return resolved.map((item) => {
    const next: ExtractionItem = {
      ...item,
      due_date: item.due_date ?? null,
      due_date_raw: item.due_date_raw ?? null,
      description: compactText(item.description),
      dependencies: Array.isArray(item.dependencies) ? item.dependencies : []
    };

    if (item.relative_source === "anchor_item" || item.relative_source === "base_date") {
      upgradeConfidenceIfResolved(next);
    }

    if (!next.due_date && containsRelativeDateExpression(next)) {
      markUncertainIfUnresolvedRelative(next, item.relative_anchor_text);
    }

    return next;
  });
}

export function normalizeItem(item: ExtractionItem, baseDate: string | null): ExtractionItem {
  return normalizeItems([item], baseDate)[0];
}

export function escapeCsv(value: string | null) {
  const raw = value ?? "";
  return `"${raw.replace(/"/g, '""')}"`;
}

export function formatIcsDate(isoDate: string) {
  return isoDate.replace(/-/g, "");
}
