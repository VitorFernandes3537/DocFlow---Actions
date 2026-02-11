import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  status: z.enum(["pending", "done"])
});

type Params = {
  params: Promise<{ itemId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { itemId } = await params;

    const body = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { error } = await supabase.from("item_status").upsert(
      {
        item_id: itemId,
        user_id: user.id,
        status: body.status
      },
      {
        onConflict: "item_id,user_id"
      }
    );

    if (error) {
      console.error("item status upsert error", error);
      return NextResponse.json({ error: "Falha ao salvar status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("item status route error", error);
    return NextResponse.json({ error: "Requisicao invalida" }, { status: 400 });
  }
}
