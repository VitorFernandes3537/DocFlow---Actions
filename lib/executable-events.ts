import { resolveRelativeDates } from "@/lib/relative-dates";

export type ExecutableEventInput = {
  id: string;
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  due_date_raw?: string | null;
  evidence_snippet?: string | null;
  conditional?: boolean | null;
  confidence?: "high" | "medium" | "low" | "uncertain" | string | null;
};

export type ExecutableEvent = {
  id: string;
  source_item_id: string;
  event_kind: "deadline" | "window_start";
  title: string;
  description: string;
  due_date: string;
  due_date_raw: string | null;
  evidence_snippet: string;
  conditional: boolean;
  confidence: "high" | "medium" | "low" | "uncertain";
};

function normalizeConfidence(
  value: ExecutableEventInput["confidence"]
): ExecutableEvent["confidence"] {
  if (value === "high" || value === "medium" || value === "low" || value === "uncertain") {
    return value;
  }

  return "medium";
}

function normalizeRawForRule(raw: string | null | undefined) {
  return (raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isWindowRule(raw: string | null | undefined) {
  const normalizedRaw = normalizeRawForRule(raw);
  return /\bate\s+\d{1,3}\s*(dias?|d|horas?|h)\s*(uteis|corridos)?\s*(apos|a partir de|depois de|contados?)/i.test(
    normalizedRaw
  );
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

function compareEventsByDate(a: ExecutableEvent, b: ExecutableEvent) {
  if (a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date);
  }

  if (a.event_kind !== b.event_kind) {
    return a.event_kind === "window_start" ? -1 : 1;
  }

  return a.title.localeCompare(b.title);
}

export function buildExecutableEvents(
  items: ExecutableEventInput[],
  baseDate: string | null
): ExecutableEvent[] {
  const resolved = resolveRelativeDates(
    items.map((item) => ({
      id: String(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      due_date: item.due_date ?? null,
      due_date_raw: item.due_date_raw ?? null,
      evidence_snippet: String(item.evidence_snippet ?? ""),
      confidence: String(item.confidence ?? "medium")
    })),
    baseDate
  );

  const events: ExecutableEvent[] = [];

  for (const row of resolved) {
    if (!row.due_date) {
      continue;
    }

    const title = String(row.title ?? "").trim() || "Sem titulo";
    const description = String(row.description ?? "").trim();
    const evidenceSnippet = String(row.evidence_snippet ?? "").trim();
    const confidence = normalizeConfidence(row.confidence);
    const conditional = Boolean((row as ExecutableEventInput).conditional);

    events.push({
      id: row.id,
      source_item_id: row.id,
      event_kind: "deadline",
      title,
      description,
      due_date: row.due_date,
      due_date_raw: row.due_date_raw ?? null,
      evidence_snippet: evidenceSnippet,
      conditional,
      confidence
    });

    const windowStart = row.relative_window_start_date ?? null;
    const shouldCreateWindowStart =
      isWindowRule(row.due_date_raw) && Boolean(windowStart) && windowStart !== row.due_date;

    if (shouldCreateWindowStart && windowStart) {
      events.push({
        id: `${row.id}-window-start`,
        source_item_id: row.id,
        event_kind: "window_start",
        title: `Inicio do prazo: ${title}`,
        description: `Prazo aberto em ${formatDateLabel(windowStart)} e encerramento em ${formatDateLabel(row.due_date)}.`,
        due_date: windowStart,
        due_date_raw: row.due_date_raw ?? null,
        evidence_snippet: evidenceSnippet,
        conditional,
        confidence
      });
    }
  }

  return events.sort(compareEventsByDate);
}
