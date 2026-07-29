import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productoSchema } from "@/modules/productos/types/schemas";
import { calcularPrecioVenta } from "@/modules/productos/lib/precios";

// GET /api/productos?q=texto — listado con búsqueda opcional por nombre
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  let query = supabase
    .from("productos")
    .select(
      `
      id, nombre, descripcion, activo, margen_default, created_at,
      marca:marcas(id, nombre),
      categoria:categorias(id, nombre),
      variantes:variantes_producto(
        id, codigo_interno, talle, color, costo, precio_venta, activo,
        stock(cantidad, stock_minimo)
      )
    `
    )
    .eq("activo", true)
    .order("nombre");

  if (q) {
    query = query.ilike("nombre", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/productos — crea un producto junto con sus variantes y stock inicial
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { variantes, ...producto } = parsed.data;

  // 1. Crear el producto
  const { data: productoCreado, error: errorProducto } = await supabase
    .from("productos")
    .insert(producto)
    .select()
    .single();

  if (errorProducto || !productoCreado) {
    return NextResponse.json(
      { error: errorProducto?.message ?? "No se pudo crear el producto" },
      { status: 500 }
    );
  }

  // 2. Crear cada variante (el código interno lo autogenera un trigger en la DB)
  const variantesAInsertar = variantes.map((v) => ({
    producto_id: productoCreado.id,
    talle: v.talle,
    color: v.color,
    costo: v.costo,
    precio_venta:
      v.precio_venta ??
      calcularPrecioVenta(v.costo, producto.margen_default ?? 0),
  }));

  const { data: variantesCreadas, error: errorVariantes } = await supabase
    .from("variantes_producto")
    .insert(variantesAInsertar)
    .select();

  if (errorVariantes || !variantesCreadas) {
    // El producto ya se creó: lo dejamos, pero avisamos del fallo parcial.
    // (Alternativa descartada: transacción atómica vía RPC — se deja como
    // mejora si en la práctica llegan a darse fallos parciales seguido.)
    return NextResponse.json(
      {
        error: errorVariantes?.message ?? "No se pudieron crear las variantes",
        producto_id: productoCreado.id,
      },
      { status: 500 }
    );
  }

  // 3. Obtener la sucursal única (hoy solo hay una) y cargar el stock inicial
  //    como un movimiento de tipo 'ingreso_compra' — nunca se escribe stock
  //    directamente, siempre queda el rastro del movimiento.
  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .single();

  if (sucursal) {
    // Primero se asegura la fila de stock (cantidad 0) con su mínimo definido,
    // incluso para variantes que arrancan sin stock. Después se aplican los
    // movimientos de ingreso, que suman sobre esa base vía trigger.
    const filasStock = variantesCreadas.map((variante, i) => ({
      variante_id: variante.id,
      sucursal_id: sucursal.id,
      cantidad: 0,
      stock_minimo: variantes[i].stock_minimo,
    }));
    await supabase.from("stock").upsert(filasStock);

    const movimientos = variantesCreadas
      .map((variante, i) => ({
        variante_id: variante.id,
        sucursal_id: sucursal.id,
        tipo: "ingreso_compra" as const,
        cantidad: variantes[i].stock_inicial,
        motivo: "Alta de producto",
      }))
      .filter((m) => m.cantidad > 0);

    if (movimientos.length > 0) {
      await supabase.from("movimientos_stock").insert(movimientos);
    }
  }

  return NextResponse.json(
    { data: { ...productoCreado, variantes: variantesCreadas } },
    { status: 201 }
  );
}
