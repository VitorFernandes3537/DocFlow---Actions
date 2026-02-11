const ISO_DATE_REGEX = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const BR_DATE_REGEX = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;

const STOP_WORDS = new Set([
  "a",
  "ao",
  "aos",
  "apos",
  "as",
  "ate",
  "com",
  "contados",
  "corridos",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "por",
  "que",
  "se",
  "sem",
  "uma",
  "um"
]);

const GENERIC_BASE_TERMS = new Set([
  "edital",
  "documento",
  "publicacao",
  "publicado",
  "divulgacao",
  "divulgado"
]);

export type RelativeDateInputItem = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_date_raw?: string | null;
  evidence_snippet?: string | null;
  confidence?: string | null;
};

type RelativeUnit = "days" | "business_days" | "hours";
type RelativeRule = "window_after" | "after" | "before";

type RelativeInstruction = {
  amount: number;
  unit: RelativeUnit;
  rule: RelativeRule;
  anchorText: string;
};

type AnchorCandidate = {
  id: string;
  dueDate: string;
  searchable: string;
};

export type RelativeDateResolution<T extends RelativeDateInputItem> = T & {
  due_date: string | null;
  due_date_raw: string | null;
  relative_rule: RelativeRule | null;
  relative_anchor_text: string | null;
  relative_window_start_date: string | null;
  relative_source: "none" | "explicit_date" | "anchor_item" | "base_date" | "unresolved";
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return compactText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s/.-]/gu, " ");
}

function normalizeDateInput(value: string | null | undefined) {
  const raw = compactText(value ?? "");
  if (!raw) {
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return null;
}

function extractDateMentions(value: string) {
  const source = compactText(value);
  if (!source) {
    return [] as string[];
  }

  const matches: Array<{ index: number; iso: string }> = [];
  ISO_DATE_REGEX.lastIndex = 0;
  BR_DATE_REGEX.lastIndex = 0;

  for (const match of source.matchAll(ISO_DATE_REGEX)) {
    if (!match[0]) {
      continue;
    }
    matches.push({
      index: match.index ?? Number.MAX_SAFE_INTEGER,
      iso: `${match[1]}-${match[2]}-${match[3]}`
    });
  }

  for (const match of source.matchAll(BR_DATE_REGEX)) {
    if (!match[0]) {
      continue;
    }
    matches.push({
      index: match.index ?? Number.MAX_SAFE_INTEGER,
      iso: `${match[3]}-${match[2]}-${match[1]}`
    });
  }

  matches.sort((a, b) => a.index - b.index);
  const unique = new Set<string>();

  for (const item of matches) {
    unique.add(item.iso);
  }

  return Array.from(unique);
}

function parseRelativeInstruction(value: string): RelativeInstruction | null {
  const normalized = normalizeForMatch(value);
  if (!normalized) {
    return null;
  }

  const patterns: Array<{
    rule: RelativeRule;
    regex: RegExp;
    parse: (match: RegExpExecArray) => RelativeInstruction;
  }> = [
    {
      rule: "window_after",
      regex:
        /(?:no\s+prazo\s+de\s+)?(?:em\s+)?ate\s+(\d{1,3})\s*(dias?|d|horas?|h)\s*(uteis|corridos)?\s*(?:apos|a\s+partir\s+de|depois\s+de|contados?\s+(?:da|do|de))\s+(.+)/i,
      parse: (match) => ({
        amount: Number(match[1]),
        unit: toRelativeUnit(match[2], match[3]),
        rule: "window_after",
        anchorText: cleanAnchorText(match[4] ?? "")
      })
    },
    {
      rule: "after",
      regex:
        /(\d{1,3})\s*(dias?|d|horas?|h)\s*(uteis|corridos)?\s*(?:apos|a\s+partir\s+de|depois\s+de|contados?\s+(?:da|do|de))\s+(.+)/i,
      parse: (match) => ({
        amount: Number(match[1]),
        unit: toRelativeUnit(match[2], match[3]),
        rule: "after",
        anchorText: cleanAnchorText(match[4] ?? "")
      })
    },
    {
      rule: "before",
      regex: /(\d{1,3})\s*(dias?|d|horas?|h)\s*(uteis|corridos)?\s*antes\s+de\s+(.+)/i,
      parse: (match) => ({
        amount: Number(match[1]),
        unit: toRelativeUnit(match[2], match[3]),
        rule: "before",
        anchorText: cleanAnchorText(match[4] ?? "")
      })
    }
  ];

  for (const pattern of patterns) {
    const found = pattern.regex.exec(normalized);
    if (!found) {
      continue;
    }

    const parsed = pattern.parse(found);
    if (parsed.amount <= 0) {
      return null;
    }

    return parsed;
  }

  return null;
}

function toRelativeUnit(rawUnit: string, rawQualifier: string | undefined) {
  const unit = (rawUnit ?? "").toLowerCase();
  const qualifier = (rawQualifier ?? "").toLowerCase();

  if (unit.startsWith("h")) {
    return "hours";
  }

  if (qualifier.includes("ute")) {
    return "business_days";
  }

  return "days";
}

function cleanAnchorText(value: string) {
  return compactText(
    value
      .replace(/[;,.]+$/g, "")
      .replace(/\s+(?:e|ou)\s+(?:que|quando|se)\b.*$/i, "")
      .replace(/^(da|do|de|a|o)\s+/i, "")
  );
}

function extractTokens(value: string) {
  const normalized = normalizeForMatch(value);
  const tokens = normalized
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));

  return Array.from(new Set(tokens));
}

function buildAnchorCandidates<T extends RelativeDateInputItem>(items: Array<T>) {
  const candidates: AnchorCandidate[] = [];

  for (const item of items) {
    const dueDate = normalizeDateInput(item.due_date ?? null);
    if (!dueDate) {
      continue;
    }

    const searchable = normalizeForMatch(
      `${item.title ?? ""} ${item.description ?? ""} ${item.evidence_snippet ?? ""} ${item.due_date_raw ?? ""}`
    );

    candidates.push({
      id: item.id,
      dueDate,
      searchable
    });
  }

  return candidates;
}

function formatIsoUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarDaysUtc(startIso: string, days: number) {
  const date = new Date(`${startIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoUTC(date);
}

function addBusinessDaysUtc(startIso: string, businessDays: number) {
  const date = new Date(`${startIso}T00:00:00Z`);
  let remaining = Math.abs(businessDays);
  const direction = businessDays >= 0 ? 1 : -1;

  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + direction);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return formatIsoUTC(date);
}

function addHoursUtc(startIso: string, hours: number) {
  const date = new Date(`${startIso}T00:00:00Z`);
  date.setUTCHours(date.getUTCHours() + hours);
  return formatIsoUTC(date);
}

function applyRelativeOffset(anchorDate: string, instruction: RelativeInstruction) {
  const direction = instruction.rule === "before" ? -1 : 1;
  const amount = instruction.amount * direction;

  if (instruction.unit === "hours") {
    return addHoursUtc(anchorDate, amount);
  }

  if (instruction.unit === "business_days") {
    return addBusinessDaysUtc(anchorDate, amount);
  }

  return addCalendarDaysUtc(anchorDate, amount);
}

function resolveAnchorDate(
  anchorText: string,
  candidates: AnchorCandidate[],
  baseDate: string | null
) {
  const explicit = extractDateMentions(anchorText)[0];
  if (explicit) {
    return { dueDate: explicit, source: "explicit_date" as const };
  }

  const tokens = extractTokens(anchorText);
  const normalizedAnchor = normalizeForMatch(anchorText);

  if (tokens.length === 0) {
    if (baseDate) {
      return { dueDate: baseDate, source: "base_date" as const };
    }
    return null;
  }

  let best:
    | {
        score: number;
        hits: number;
        dueDate: string;
      }
    | null = null;

  for (const candidate of candidates) {
    const hits = tokens.reduce((acc, token) => {
      return acc + (candidate.searchable.includes(token) ? 1 : 0);
    }, 0);

    if (hits === 0) {
      continue;
    }

    const ratio = hits / tokens.length;
    const phraseBonus =
      normalizedAnchor.length >= 8 && candidate.searchable.includes(normalizedAnchor) ? 0.45 : 0;
    const score = ratio + phraseBonus;

    if (!best || score > best.score) {
      best = {
        score,
        hits,
        dueDate: candidate.dueDate
      };
    }
  }

  if (best) {
    const threshold = tokens.length <= 2 ? 0.45 : 0.34;
    const minHits = Math.min(2, tokens.length);

    if (best.score >= threshold && best.hits >= minHits) {
      return { dueDate: best.dueDate, source: "anchor_item" as const };
    }
  }

  const hasGenericBaseTerm = tokens.some((token) => GENERIC_BASE_TERMS.has(token));
  if (hasGenericBaseTerm && baseDate) {
    return { dueDate: baseDate, source: "base_date" as const };
  }

  if (candidates.length === 1 && tokens.length <= 2) {
    return { dueDate: candidates[0].dueDate, source: "anchor_item" as const };
  }

  return null;
}

function collectRelativeSourceText(item: RelativeDateInputItem) {
  return [
    compactText(item.due_date_raw ?? ""),
    compactText(item.description ?? ""),
    compactText(item.evidence_snippet ?? ""),
    compactText(item.title ?? "")
  ].filter(Boolean);
}

export function containsRelativeDateExpression(item: RelativeDateInputItem) {
  return collectRelativeSourceText(item).some((part) => Boolean(parseRelativeInstruction(part)));
}

export function resolveRelativeDates<T extends RelativeDateInputItem>(
  items: Array<T>,
  baseDate: string | null
): Array<RelativeDateResolution<T>> {
  const normalizedBaseDate = normalizeDateInput(baseDate);

  const result: Array<RelativeDateResolution<T>> = items.map((item) => {
    const normalizedDueDate = normalizeDateInput(item.due_date ?? null);
    const normalizedRaw = compactText(item.due_date_raw ?? "");

    const explicitFromRaw = !normalizedDueDate && normalizedRaw
      ? extractDateMentions(normalizedRaw)[0] ?? null
      : null;

    return {
      ...item,
      due_date: normalizedDueDate ?? explicitFromRaw ?? null,
      due_date_raw: normalizedRaw || null,
      relative_rule: null as RelativeRule | null,
      relative_anchor_text: null as string | null,
      relative_window_start_date: null as string | null,
      relative_source: (normalizedDueDate || explicitFromRaw ? "explicit_date" : "none") as RelativeDateResolution<T>["relative_source"]
    };
  });

  const unresolved = new Set(
    result
      .filter((item) => !item.due_date)
      .map((item) => item.id)
  );

  for (let pass = 0; pass < Math.max(1, items.length); pass += 1) {
    if (unresolved.size === 0) {
      break;
    }

    const candidates = buildAnchorCandidates(result);
    let progressed = false;

    for (const item of result) {
      if (!unresolved.has(item.id) || item.due_date) {
        continue;
      }

      const sourceSegments = collectRelativeSourceText(item);

      let instruction: RelativeInstruction | null = null;
      for (const segment of sourceSegments) {
        instruction = parseRelativeInstruction(segment);
        if (instruction) {
          break;
        }
      }

      if (!instruction) {
        continue;
      }

      const resolvedAnchor = resolveAnchorDate(
        instruction.anchorText,
        candidates.filter((candidate) => candidate.id !== item.id),
        normalizedBaseDate
      );

      if (!resolvedAnchor) {
        item.relative_rule = instruction.rule;
        item.relative_anchor_text = instruction.anchorText || null;
        item.relative_source = "unresolved";
        continue;
      }

      const dueDate = applyRelativeOffset(resolvedAnchor.dueDate, instruction);

      item.due_date = dueDate;
      item.relative_rule = instruction.rule;
      item.relative_anchor_text = instruction.anchorText || null;
      item.relative_source = resolvedAnchor.source;
      item.relative_window_start_date =
        instruction.rule === "window_after" ? resolvedAnchor.dueDate : null;

      unresolved.delete(item.id);
      progressed = true;
    }

    if (!progressed) {
      break;
    }
  }

  for (const item of result) {
    if (item.due_date) {
      continue;
    }

    if (containsRelativeDateExpression(item)) {
      item.relative_source = "unresolved";
    }
  }

  return result;
}
