import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const movimientoSchema = z.object({
  variante_id: z.string().uuid(),
  tipo: z.enum(["ingreso_compra", "ajuste_manual", "devolucion"]),
  cantidad: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "La cantidad no puede ser cero"),
  motivo: z.string().min(1, "Indicá un motivo para el ajuste").optional(),
});

// POST /api/stock/movimientos — registra un movimiento manual de stock.
// Los movimientos de tipo 'venta' se generan desde el módulo de Ventas,
// no desde acá.
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

  const { data, error } = await supabase
    .from("movimientos_stock")
    .insert({
      variante_id: parsed.data.variante_id,
      sucursal_id: sucursal.id,
      tipo: parsed.data.tipo,
      cantidad: parsed.data.cantidad,
      motivo: parsed.data.motivo ?? null,
      usuario_id: usuarioId,
    })
    .select()
    .single();

  if (error) {
    // El trigger de la DB rechaza movimientos que dejarían stock negativo
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
