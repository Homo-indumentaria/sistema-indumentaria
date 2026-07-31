import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const movimientoSchema = z.object({
  caja_id: z.string().uuid(),
  tipo: z.enum(["retiro", "ingreso"]),
  monto: z.coerce.number().positive(),
  motivo: z.string().min(1, "Indicá un motivo"),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = movimientoSchema.safeParse(body);
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

  const { data: movimientoId, error } = await supabase.rpc("registrar_movimiento_caja", {
    p_caja_id: parsed.data.caja_id,
    p_usuario_id: usuarioId,
    p_tipo: parsed.data.tipo,
    p_monto: parsed.data.monto,
    p_motivo: parsed.data.motivo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: movimientoId } }, { status: 201 });
}
