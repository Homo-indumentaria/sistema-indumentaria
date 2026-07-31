import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const cerrarCajaSchema = z.object({
  caja_id: z.string().uuid(),
  saldo_contado: z.coerce.number().min(0),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = cerrarCajaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let usuarioId: string | null = null;
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    usuarioId = usuario?.id ?? null;
  }

  const { data, error } = await supabase.rpc("cerrar_caja", {
    p_caja_id: parsed.data.caja_id,
    p_usuario_id: usuarioId,
    p_saldo_contado: parsed.data.saldo_contado,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
