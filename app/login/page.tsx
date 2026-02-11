"use client";

import { useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { BrandLogo } from "@/components/chrome/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      alert("Falha no login Google.");
      setLoading(false);
    }
  }

  return (
    <main className="df-login-wrap">
      <Card style={{ width: "min(560px, 100%)" }}>
        <div className="grid" style={{ gap: 14 }}>
          <BrandLogo />
          <div>
            <h1 className="df-page-title" style={{ fontSize: "clamp(30px,4vw,38px)" }}>
              DocFlow Actions
            </h1>
            <p className="df-page-subtitle">
              Organize editais em checklist executável, timeline e evidências claras.
            </p>
          </div>
          <div className="row">
            <span className="df-badge df-badge-info">
              <Lock size={14} />
              Login via Google + Supabase
            </span>
          </div>
          <Button disabled={loading} onClick={signInWithGoogle} size="lg">
            <LogIn size={16} />
            {loading ? "Redirecionando..." : "Entrar com Google"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
