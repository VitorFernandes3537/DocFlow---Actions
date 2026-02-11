import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { HeaderBackButton } from "@/components/chrome/header-back-button";
import { FloatingHeader } from "@/components/chrome/floating-header";
import { NewDocumentForm } from "@/components/new-document-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export default async function NewDocumentPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="grid">
      <FloatingHeader
        userName={getUserName(user)}
        slotRight={
          <>
            <HeaderBackButton fallbackHref="/dashboard" />
            <Link
              href="/dashboard"
              className="df-button df-button-secondary df-button-md df-header-dashboard-button"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
          </>
        }
      />

      <section className="df-hero">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="df-page-title">Novo Documento</h1>
            <p className="df-page-subtitle">
              Envie PDF nativo e gere um plano rastreável. Se o PDF vier sem texto útil, use
              fallback por texto colado.
            </p>
          </div>
          <span className="df-badge df-badge-info">
            <Plus size={14} />
            Extração estruturada
          </span>
        </div>
      </section>

      <NewDocumentForm />
    </main>
  );
}
