import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const cambioSchema = z.object({
  tipo: z.enum(["cambio", "devolucion"]),
  variante_devuelta_id: z.string().uuid(),
  cantidad_devuelta: z.coerce.number().int().min(1),
  variante_nueva_id: z.string().uuid().optional(),
  cantidad_nueva: z.coerce.number().int().min(1).optional(),
  motivo: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: venta_original_id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = cambioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (
    parsed.data.tipo === "cambio" &&
    (!parsed.data.variante_nueva_id || !parsed.data.cantidad_nueva)
  ) {
    return NextResponse.json(
      { error: "Un cambio necesita indicar el producto nuevo y su cantidad" },
      { status: 400 }
    );
  }

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .single();

  if (!sucursal) {
    return NextResponse.json(
      { error: "No hay ninguna sucursal activa configurada" },
      { status: 500 }
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

  const { data: cambioId, error } = await supabase.rpc("registrar_cambio_devolucion", {
    p_venta_original_id: venta_original_id,
    p_sucursal_id: sucursal.id,
    p_usuario_id: usuarioId,
    p_tipo: parsed.data.tipo,
    p_variante_devuelta_id: parsed.data.variante_devuelta_id,
    p_cantidad_devuelta: parsed.data.cantidad_devuelta,
    p_variante_nueva_id: parsed.data.variante_nueva_id ?? null,
    p_cantidad_nueva: parsed.data.cantidad_nueva ?? null,
    p_motivo: parsed.data.motivo ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: cambioId } }, { status: 201 });
}
