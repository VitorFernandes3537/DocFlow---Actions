import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FloatingHeader } from "@/components/chrome/floating-header";
import { DocumentCard } from "@/components/dashboard/document-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  return user.email ?? "Usuário";
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id,title,source_type,base_date,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  async function signOut() {
    "use server";

    const scoped = await createServerSupabaseClient();
    await scoped.auth.signOut();
    redirect("/login");
  }

  const userName = getUserName(user);

  return (
    <main className="grid">
      <FloatingHeader
        userName={userName}
        slotRight={
          <>
            <Link href="/document/new" className="df-button df-button-primary df-button-md">
              <Plus size={16} />
              Novo documento
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sair
              </Button>
            </form>
          </>
        }
      />

      <section className="df-hero">
        <h1 className="df-page-title">Seu centro de execução documental</h1>
        <p className="df-page-subtitle">
          Escolha um documento para revisar checklist, timeline e evidências rastreáveis.
          Tudo pronto para a demonstração em tempo real.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="df-badge df-badge-info">
            <Sparkles size={14} /> DocFlow Actions
          </span>
        </div>
      </section>

      <Card>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Seus documentos</h2>
          <span className="small">{documents?.length ?? 0} item(ns)</span>
        </div>
      </Card>

      {documents && documents.length > 0 ? (
        <section className="df-dashboard-docs">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              sourceType={doc.source_type}
              baseDate={doc.base_date}
            />
          ))}
        </section>
      ) : (
        <Card>
          <p className="small">Nenhum documento ainda. Clique em "Novo documento" para começar.</p>
        </Card>
      )}
    </main>
  );
}
