import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearVentaSchema } from "@/modules/ventas/types/schemas";
import { DESCUENTO_POR_MEDIO_PAGO } from "@/modules/ventas/lib/reglasNegocio";

// GET /api/ventas — listado reciente (para el historial)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const limite = Number(request.nextUrl.searchParams.get("limite") ?? 30);

  const { data, error } = await supabase
    .from("ventas")
    .select(
      `
      id, numero_venta, fecha, medio_pago, descuento_porcentaje,
      subtotal, total, estado, requiere_factura, estado_factura,
      usuario:usuarios(nombre)
    `
    )
    .order("fecha", { ascending: false })
    .limit(limite);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/ventas — registra una venta nueva.
// El precio de cada ítem se toma del lado del servidor (nunca del body
// que manda el navegador) para que nadie pueda manipular precios desde
// el cliente.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearVentaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { medio_pago, items } = parsed.data;

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

  // Trae el precio_venta real de cada variante desde la base (autoridad
  // única de precios), ignorando cualquier precio que venga del cliente.
  const idsVariantes = items.map((i) => i.variante_id);
  const { data: variantes, error: errorVariantes } = await supabase
    .from("variantes_producto")
    .select("id, precio_venta, activo")
    .in("id", idsVariantes);

  if (errorVariantes || !variantes || variantes.length !== idsVariantes.length) {
    return NextResponse.json(
      { error: "Alguno de los productos de la venta ya no existe" },
      { status: 400 }
    );
  }

  const inactiva = variantes.find((v) => !v.activo);
  if (inactiva) {
    return NextResponse.json(
      { error: "Uno de los productos está inactivo, no se puede vender" },
      { status: 400 }
    );
  }

  const precioPorVariante = new Map(variantes.map((v) => [v.id, v.precio_venta]));
  const itemsConPrecio = items.map((i) => ({
    variante_id: i.variante_id,
    cantidad: i.cantidad,
    precio_unitario: precioPorVariante.get(i.variante_id)!,
  }));

  const descuentoPorcentaje = DESCUENTO_POR_MEDIO_PAGO[medio_pago];

  const { data: ventaId, error: errorVenta } = await supabase.rpc("registrar_venta", {
    p_sucursal_id: sucursal.id,
    p_usuario_id: usuarioId,
    p_medio_pago: medio_pago,
    p_descuento_porcentaje: descuentoPorcentaje,
    p_items: itemsConPrecio,
  });

  if (errorVenta) {
    // Puede ser el trigger de stock rechazando un ítem por falta de stock
    return NextResponse.json({ error: errorVenta.message }, { status: 400 });
  }

  const { data: venta } = await supabase
    .from("ventas")
    .select("id, numero_venta, total, requiere_factura, estado_factura")
    .eq("id", ventaId)
    .single();

  return NextResponse.json({ data: venta }, { status: 201 });
}
