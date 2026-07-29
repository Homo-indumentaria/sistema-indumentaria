import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const actualizarVarianteSchema = z.object({
  talle: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  costo: z.coerce.number().min(0).optional(),
  precio_venta: z.coerce.number().min(0).optional(),
  activo: z.boolean().optional(),
});

// PATCH /api/variantes/:id — edita talle, color, costo, precio o estado
// activo de una variante puntual. El stock NO se toca acá: se ajusta
// exclusivamente vía POST /api/stock/movimientos para mantener el
// historial completo.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = actualizarVarianteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("variantes_producto")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // El código único (producto_id, talle, color) puede rechazar el update
    // si ya existe otra variante con esa combinación.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
