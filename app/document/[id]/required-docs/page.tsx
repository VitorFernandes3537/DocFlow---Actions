import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { FloatingHeader } from "@/components/chrome/floating-header";
import RequiredDocsTimeline, {
  type RequiredDocsTimelineItem
} from "@/components/document/RequiredDocsTimeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { getRequiredDocIconKey } from "@/components/ui/icon-map";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

type RequiredDocsGroup = {
  id: string;
  label: string;
  items: RequiredDocsTimelineItem[];
};

function getUserName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const fullName = user.user_metadata?.full_name;
  const name = user.user_metadata?.name;
  const candidate = typeof fullName === "string" ? fullName : typeof name === "string" ? name : "";
  if (candidate.trim()) {
    return candidate;
  }
  return user.email ?? "Usuario";
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeGroupLabel(value: string) {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  if (/^(lista|relacao)\b/.test(normalized)) {
    return true;
  }

  if (/^documentos\s+(exigidos|obrigatorios)\b/.test(normalized)) {
    return true;
  }

  if (/^documentos\s+para\b/.test(normalized)) {
    return true;
  }

  return /\bdocumentos\b/.test(normalized) && /\b(inscri|matric|convoc|fase|etapa)\b/.test(normalized);
}

function inferGroupLabel(rawTitle: string, description: string | null) {
  const title = normalizeText(rawTitle);
  const descriptionText = normalizeText(description ?? "");
  const combined = `${title} ${descriptionText}`.toLowerCase();

  if (combined.includes("inscri")) {
    return "Documentos para inscricao";
  }

  if (combined.includes("matric")) {
    return "Documentos para matricula";
  }

  if (combined.includes("convoc")) {
    return "Documentos para convocacao";
  }

  if (combined.includes("segunda fase")) {
    return "Documentos para segunda fase";
  }

  if (looksLikeGroupLabel(descriptionText)) {
    return descriptionText;
  }

  if (looksLikeGroupLabel(title)) {
    return title;
  }

  return "Documentos exigidos";
}

function extractRequiredDocumentNames(value: string | null) {
  const source = (value ?? "").replace(/\r/g, "").trim();

  if (!source) {
    return [];
  }

  const chunks = source.split(/\n+/g).flatMap((line) => line.split(/[;\u2022|]+/g));
  const docs: string[] = [];

  for (const chunk of chunks) {
    let chunkValue = chunk
      .replace(/^[-*]\s*/g, "")
      .replace(/^\d{1,2}\s*[\)\.\-]\s*/g, "")
      .trim();

    if (!chunkValue) {
      continue;
    }

    if (/^item[_\s-]*\d+$/i.test(chunkValue)) {
      continue;
    }

    if (/documentos?:/i.test(chunkValue)) {
      const afterColon = normalizeText(chunkValue.replace(/^.*documentos?:\s*/i, ""));
      if (!afterColon) {
        continue;
      }
      chunkValue = afterColon;
    }

    if (/:\s*$/.test(chunkValue)) {
      continue;
    }

    const maybeDocs = chunkValue.includes(",") ? chunkValue.split(/\s*,\s*/g) : [chunkValue];

    for (const maybeDoc of maybeDocs) {
      const normalized = normalizeText(maybeDoc).replace(/[;,\.\s]+$/g, "");

      if (!normalized || normalized.length < 3) {
        continue;
      }

      if (/^(e|ou)$/i.test(normalized)) {
        continue;
      }

      docs.push(normalized);
    }
  }

  return Array.from(new Set(docs));
}

export default async function DocumentRequiredDocsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,title,source_type,base_date")
    .eq("id", id)
    .single();

  if (documentError || !document) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("extracted_items")
    .select("id,title,description,evidence_snippet,confidence,created_at")
    .eq("document_id", id)
    .eq("type", "required_doc")
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const groupedDocs = new Map<string, RequiredDocsGroup>();
  const groupsOrder: string[] = [];

  for (const item of items ?? []) {
    const rawTitle = normalizeText(item.title?.trim() || "Documento sem titulo");
    const titleIsGroupLabel = looksLikeGroupLabel(rawTitle);
    const groupLabel = inferGroupLabel(rawTitle, item.description);
    const groupId = normalizeText(groupLabel).toLowerCase();

    const fromDescription = extractRequiredDocumentNames(item.description);
    const fromEvidence = extractRequiredDocumentNames(item.evidence_snippet);
    const fromTitle = extractRequiredDocumentNames(rawTitle);

    let documentNames: string[] = [];

    if (titleIsGroupLabel) {
      if (fromDescription.length > 0) {
        documentNames = fromDescription;
      } else if (fromEvidence.length > 0) {
        documentNames = fromEvidence;
      }
    } else if (fromTitle.length > 1) {
      documentNames = fromTitle;
    } else {
      documentNames = [rawTitle];
    }

    if (!documentNames.length) {
      documentNames = [rawTitle];
    }

    if (!groupedDocs.has(groupId)) {
      groupedDocs.set(groupId, {
        id: groupId,
        label: groupLabel,
        items: []
      });
      groupsOrder.push(groupId);
    }

    const group = groupedDocs.get(groupId)!;
    const seenNames = new Set(group.items.map((existing) => normalizeText(existing.title).toLowerCase()));

    for (let index = 0; index < documentNames.length; index += 1) {
      const documentName = normalizeText(documentNames[index]);
      const dedupeKey = documentName.toLowerCase();

      if (!documentName || seenNames.has(dedupeKey)) {
        continue;
      }

      seenNames.add(dedupeKey);
      const icon = getRequiredDocIconKey(documentName, documentName);

      group.items.push({
        id: `${item.id}-${index}`,
        title: documentName,
        description: "",
        icon
      });
    }
  }

  const groups = groupsOrder
    .map((groupId) => groupedDocs.get(groupId)!)
    .filter((group) => group.items.length > 0);
  const totalDocuments = groups.reduce((acc, group) => acc + group.items.length, 0);
  let runningColorOffset = 0;
  const groupsWithColorOffset = groups.map((group) => {
    const colorOffset = runningColorOffset;
    runningColorOffset += group.items.length;

    return {
      ...group,
      colorOffset
    };
  });

  return (
    <main className="document-shell required-docs-page">
      <FloatingHeader
        userName={getUserName(user)}
        slotRight={
          <>
            <Link href={`/document/${id}`} className="df-button df-button-secondary df-button-md">
              <ArrowLeft size={16} />
              Documento
            </Link>
            <Link
              href="/dashboard"
              className="df-button df-button-secondary df-button-md df-header-dashboard-button"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </>
        }
      />

      <section className="df-hero df-hero-compact">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="df-page-title">Documentos exigidos</h1>
            <p className="df-page-subtitle">
              {document.title} | Fonte: {document.source_type}
              {document.base_date ? ` | Data base: ${document.base_date}` : ""}
            </p>
          </div>
          <Badge tone="info">{totalDocuments}</Badge>
        </div>
      </section>

      <Card>
        <CardTitle>Timelines de documentos por relacao</CardTitle>
        <CardSubtitle>
          Cada relacao abaixo tem sua propria timeline horizontal com um pill por documento.
        </CardSubtitle>
        {groupsWithColorOffset.length > 0 ? (
          <div className="rdg-list">
            {groupsWithColorOffset.map((group) => (
              <section key={group.id} className="rdg-group">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3 className="rdg-title">{group.label}</h3>
                  <Badge tone="info">{group.items.length}</Badge>
                </div>
                <RequiredDocsTimeline
                  items={group.items}
                  colorOffset={group.colorOffset}
                  colorSpan={Math.max(totalDocuments, group.items.length)}
                  hint="Arraste para o lado para visualizar todos os documentos desta relacao."
                />
              </section>
            ))}
          </div>
        ) : (
          <p className="small" style={{ marginTop: 10 }}>
            Nenhum documento obrigatorio foi identificado para este arquivo.
          </p>
        )}
      </Card>
    </main>
  );
}
