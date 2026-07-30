import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: venta, error } = await supabase
    .from("ventas")
    .select(
      `
      id, numero_venta, fecha, medio_pago, descuento_porcentaje,
      subtotal, total, estado, requiere_factura, estado_factura,
      usuario:usuarios(nombre),
      items:venta_items(
        id, cantidad, precio_unitario_venta, subtotal,
        variante:variantes_producto(
          id, codigo_interno, talle, color,
          producto:productos(nombre)
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { data: cambios } = await supabase
    .from("cambios_devoluciones")
    .select(
      `
      id, tipo, cantidad_devuelta, cantidad_nueva, motivo, created_at,
      variante_devuelta:variantes_producto!cambios_devoluciones_variante_devuelta_id_fkey(codigo_interno, talle, color),
      variante_nueva:variantes_producto!cambios_devoluciones_variante_nueva_id_fkey(codigo_interno, talle, color)
    `
    )
    .eq("venta_original_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ data: { ...venta, cambios: cambios ?? [] } });
}
