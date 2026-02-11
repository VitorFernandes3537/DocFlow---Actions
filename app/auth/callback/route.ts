import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("exchangeCodeForSession error", error.message);
      return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
