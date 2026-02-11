import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DocumentDetails } from "@/components/document-details";
import { FloatingHeader } from "@/components/chrome/floating-header";
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

export default async function DocumentPage({ params }: Props) {
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
    .select("id,title,base_date,source_type,created_at")
    .eq("id", id)
    .single();

  if (documentError || !document) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("extracted_items")
    .select(
      "id,type,title,description,due_date,due_date_raw,conditional,dependencies,evidence_snippet,evidence_ref,confidence,created_at"
    )
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemIds = (items ?? []).map((item) => item.id);

  const { data: statuses } = itemIds.length
    ? await supabase
        .from("item_status")
        .select("item_id,status")
        .eq("user_id", user.id)
        .in("item_id", itemIds)
    : { data: [] as Array<{ item_id: string; status: "pending" | "done" }> };

  const statusMap = new Map((statuses ?? []).map((entry) => [entry.item_id, entry.status]));

  const rows = (items ?? []).map((item) => ({
    ...item,
    description: item.description ?? "",
    due_date_raw: item.due_date_raw ?? null,
    dependencies: Array.isArray(item.dependencies) ? (item.dependencies as string[]) : [],
    evidence_ref: item.evidence_ref ?? null,
    status: statusMap.get(item.id) ?? "pending"
  }));

  return (
    <main className="document-shell">
      <FloatingHeader
        userName={getUserName(user)}
        slotRight={
          <>
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

      <section className="df-hero">
        <h1 className="df-page-title">{document.title}</h1>
        <p className="df-page-subtitle">
          Fonte: {document.source_type} {document.base_date ? `| Data base: ${document.base_date}` : ""}
        </p>
      </section>

      <DocumentDetails documentId={document.id} items={rows} />
    </main>
  );
}
