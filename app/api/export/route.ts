import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatIcsDate } from "@/lib/utils";
import { buildExecutableEvents } from "@/lib/executable-events";

const querySchema = z.object({
  documentId: z.string().uuid(),
  format: z.literal("ics").optional()
});

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function normalizeFilenamePart(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (!normalized) {
    return "documento";
  }

  return normalized.slice(0, 64);
}

function normalizeForCompare(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitUniqueSegments(value: string) {
  const segments = value
    .split(/(?<=[.!?])\s+|\s+-\s+|\n/g)
    .map((segment) => compactText(segment))
    .filter(Boolean);

  const accepted: string[] = [];

  for (const segment of segments) {
    const current = normalizeForCompare(segment);
    if (!current) {
      continue;
    }

    const isDuplicate = accepted.some((existing) => {
      const normalizedExisting = normalizeForCompare(existing);
      return (
        normalizedExisting === current ||
        normalizedExisting.includes(current) ||
        current.includes(normalizedExisting)
      );
    });

    if (!isDuplicate) {
      accepted.push(segment);
    }
  }

  return accepted;
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength);
  const safe = sliced.slice(0, sliced.lastIndexOf(" "));
  return `${safe || sliced}...`;
}

function looksRedundant(base: string, candidate: string) {
  if (!base || !candidate) {
    return false;
  }

  const normalizedBase = normalizeForCompare(base);
  const normalizedCandidate = normalizeForCompare(candidate);

  return (
    normalizedBase === normalizedCandidate ||
    normalizedBase.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedBase)
  );
}

function buildSummary(title: string, description: string) {
  const titleSegments = splitUniqueSegments(title);
  const titleText = compactText(titleSegments.join(" - "));

  if (titleText) {
    return truncateAtWord(titleText, 120);
  }

  const descriptionSegments = splitUniqueSegments(description);
  return truncateAtWord(compactText(descriptionSegments.join(" ")), 120) || "Tarefa";
}

function buildDescription(summary: string, description: string, evidence: string) {
  const desc = compactText(splitUniqueSegments(description).join(" "));
  const evidenceText = compactText(splitUniqueSegments(evidence).join(" "));

  const lines: string[] = [];

  if (desc && !looksRedundant(summary, desc)) {
    lines.push(truncateAtWord(desc, 240));
  }

  if (evidenceText && !looksRedundant(desc || summary, evidenceText)) {
    lines.push(`Evidencia: ${truncateAtWord(evidenceText, 280)}`);
  }

  return lines.join("\n");
}

type IcsRow = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  evidence_snippet: string;
};

function buildIcs(rows: Array<IcsRow>, documentTitle: string) {
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10).replace(/-/g, "")}T000000Z`;

  const events: string[] = [];

  for (const row of rows) {
    if (!row.due_date) {
      continue;
    }

    const due = row.due_date;
    const summary = buildSummary(row.title, row.description);
    const description = buildDescription(summary, row.description, row.evidence_snippet);

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${row.id}@docflow-actions`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${formatIcsDate(due)}`,
        `SUMMARY:${escapeIcs(summary)}`,
        ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
        "END:VEVENT"
      ].join("\n")
    );
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DocFlow Actions//MVP//PT-BR",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:DocFlow ${escapeIcs(documentTitle)}`,
    ...events,
    "END:VCALENDAR"
  ].join("\n");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = querySchema.parse({
      documentId: url.searchParams.get("documentId"),
      format: url.searchParams.get("format") ?? "ics"
    });

    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id,title,base_date")
      .eq("id", query.documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: "Documento nao encontrado" }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("extracted_items")
      .select(
        "id,type,title,description,due_date,due_date_raw,conditional,dependencies,confidence,evidence_ref,evidence_snippet"
      )
      .eq("document_id", query.documentId)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("export items error", itemsError);
      return NextResponse.json({ error: "Falha ao carregar itens" }, { status: 500 });
    }

    const rows = (items ?? []).map((item) => ({
      id: String(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      due_date: item.due_date ?? null,
      due_date_raw: item.due_date_raw ?? null,
      evidence_snippet: String(item.evidence_snippet ?? ""),
      conditional: Boolean(item.conditional),
      confidence: String(item.confidence ?? "medium")
    }));

    const executableEvents = buildExecutableEvents(rows, document.base_date ?? null);

    const icsRows: IcsRow[] = executableEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      due_date: event.due_date,
      evidence_snippet: event.evidence_snippet
    }));

    const ics = buildIcs(icsRows, document.title ?? "Documento");
    const safeTitle = normalizeFilenamePart(document.title ?? "Documento");

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="DocFlow-${safeTitle}.ics"`
      }
    });
  } catch (error) {
    console.error("/api/export error", error);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
