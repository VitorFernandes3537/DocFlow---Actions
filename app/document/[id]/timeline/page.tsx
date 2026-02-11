import Link from "next/link";
import { ArrowLeft, FileDown, LayoutDashboard } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { FloatingHeader } from "@/components/chrome/floating-header";
import { TimelineView } from "@/components/document/timeline-view";
import { buildExecutableEvents } from "@/lib/executable-events";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
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

export default async function DocumentTimelinePage({ params }: Props) {
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
    .select("id,title,base_date,source_type")
    .eq("id", id)
    .single();

  if (documentError || !document) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("extracted_items")
    .select("id,title,description,due_date,due_date_raw,conditional,confidence,evidence_snippet")
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const executableEvents = buildExecutableEvents(
    (items ?? []).map((item) => ({
      id: String(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      due_date: item.due_date ?? null,
      due_date_raw: item.due_date_raw ?? null,
      conditional: Boolean(item.conditional),
      confidence: String(item.confidence ?? "medium"),
      evidence_snippet: String(item.evidence_snippet ?? "")
    })),
    document.base_date ?? null
  );

  const rows = executableEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    due_date: event.due_date,
    due_date_raw: event.due_date_raw,
    conditional: event.conditional,
    confidence: event.confidence,
    evidence_snippet: event.evidence_snippet
  })) as Array<{
    id: string;
    title: string;
    description: string;
    due_date: string | null;
    due_date_raw: string | null;
    conditional: boolean;
    confidence: "high" | "medium" | "low" | "uncertain";
    evidence_snippet: string;
  }>;

  return (
    <main className="document-shell">
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
            <h1 className="df-page-title">Timeline executavel</h1>
            <p className="df-page-subtitle">
              {document.title} | Fonte: {document.source_type}
              {document.base_date ? ` | Data base: ${document.base_date}` : ""}
            </p>
          </div>
          <a
            href={`/api/export?documentId=${document.id}&format=ics`}
            className="df-button df-button-primary df-button-md df-timeline-export"
          >
            <FileDown size={16} />
            Exportar ICS
          </a>
        </div>
      </section>

      <TimelineView items={rows} />
    </main>
  );
}
