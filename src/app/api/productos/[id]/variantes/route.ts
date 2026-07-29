import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { varianteSchema } from "@/modules/productos/types/schemas";
import { calcularPrecioVenta } from "@/modules/productos/lib/precios";

// POST /api/productos/:id/variantes — agrega una variante nueva (talle/color)
// a un producto que ya existe, con su stock inicial.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: producto_id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = varianteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: producto } = await supabase
    .from("productos")
    .select("margen_default")
    .eq("id", producto_id)
    .single();

  const v = parsed.data;
  const { data: variante, error } = await supabase
    .from("variantes_producto")
    .insert({
      producto_id,
      talle: v.talle,
      color: v.color,
      costo: v.costo,
      precio_venta:
        v.precio_venta ??
        calcularPrecioVenta(v.costo, producto?.margen_default ?? 0),
    })
    .select()
    .single();

  if (error || !variante) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo crear la variante" },
      { status: 400 }
    );
  }

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .single();

  if (sucursal) {
    await supabase.from("stock").upsert({
      variante_id: variante.id,
      sucursal_id: sucursal.id,
      cantidad: 0,
      stock_minimo: v.stock_minimo,
    });
    if (v.stock_inicial > 0) {
      await supabase.from("movimientos_stock").insert({
        variante_id: variante.id,
        sucursal_id: sucursal.id,
        tipo: "ingreso_compra",
        cantidad: v.stock_inicial,
        motivo: "Nueva variante agregada",
      });
    }
  }

  return NextResponse.json({ data: variante }, { status: 201 });
}
