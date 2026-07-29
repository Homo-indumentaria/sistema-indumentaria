import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const actualizarProductoSchema = z.object({
  nombre: z.string().min(2).optional(),
  descripcion: z.string().nullable().optional(),
  marca_id: z.string().uuid().nullable().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  margen_default: z.coerce.number().min(0).max(1000).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select(
      `
      id, nombre, descripcion, activo, margen_default,
      marca:marcas(id, nombre),
      categoria:categorias(id, nombre),
      variantes:variantes_producto(
        id, codigo_interno, talle, color, costo, precio_venta, activo,
        stock(cantidad, stock_minimo)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PATCH /api/productos/:id — edita datos generales del producto (no variantes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = actualizarProductoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("productos")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/productos/:id — baja lógica (activo = false), nunca se borra
// físicamente: preserva el historial de ventas y movimientos de stock.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
