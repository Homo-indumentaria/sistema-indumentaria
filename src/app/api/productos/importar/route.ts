import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const varianteImportSchema = z.object({
  talle: z.string(),
  color: z.string(),
  stock: z.coerce.number().int().min(0),
});

const productoImportSchema = z.object({
  nombre: z.string().min(1),
  marca: z.string().nullable(),
  categoria: z.string().nullable(),
  costo: z.coerce.number().min(0),
  precioVenta: z.coerce.number().min(0),
  variantes: z.array(varianteImportSchema).min(1),
});

const bodySchema = z.object({
  productos: z.array(productoImportSchema),
});

// Busca (o crea) una marca/categoría por nombre y devuelve su id.
async function obtenerOCrear(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabla: "marcas" | "categorias",
  nombre: string | null,
  cache: Map<string, string>
): Promise<string | null> {
  if (!nombre) return null;
  if (cache.has(nombre)) return cache.get(nombre)!;

  const { data: existente } = await supabase
    .from(tabla)
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();

  if (existente) {
    cache.set(nombre, existente.id);
    return existente.id;
  }

  const { data: creado, error } = await supabase
    .from(tabla)
    .insert({ nombre })
    .select("id")
    .single();

  if (error || !creado) return null;
  cache.set(nombre, creado.id);
  return creado.id;
}

// POST /api/productos/importar — carga masiva desde el importador de KIBOO.
// Procesa producto por producto (no todo en una única transacción) para
// que, si un producto puntual falla, el resto de la importación continúe
// y se pueda informar exactamente cuáles fallaron.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = bodySchema.safeParse(body);
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

  const cacheMarcas = new Map<string, string>();
  const cacheCategorias = new Map<string, string>();

  const resultados: { nombre: string; ok: boolean; error?: string }[] = [];

  for (const producto of parsed.data.productos) {
    try {
      const marca_id = await obtenerOCrear(supabase, "marcas", producto.marca, cacheMarcas);
      const categoria_id = await obtenerOCrear(
        supabase,
        "categorias",
        producto.categoria,
        cacheCategorias
      );

      const { data: productoCreado, error: errorProducto } = await supabase
        .from("productos")
        .insert({ nombre: producto.nombre, marca_id, categoria_id })
        .select("id")
        .single();

      if (errorProducto || !productoCreado) {
        throw new Error(errorProducto?.message ?? "No se pudo crear el producto");
      }

      const variantesAInsertar = producto.variantes.map((v) => ({
        producto_id: productoCreado.id,
        talle: v.talle,
        color: v.color,
        costo: producto.costo,
        precio_venta: producto.precioVenta,
      }));

      const { data: variantesCreadas, error: errorVariantes } = await supabase
        .from("variantes_producto")
        .insert(variantesAInsertar)
        .select("id");

      if (errorVariantes || !variantesCreadas) {
        throw new Error(errorVariantes?.message ?? "No se pudieron crear las variantes");
      }

      const filasStock = variantesCreadas.map((variante) => ({
        variante_id: variante.id,
        sucursal_id: sucursal.id,
        cantidad: 0,
        stock_minimo: 2,
      }));
      await supabase.from("stock").upsert(filasStock);

      const movimientos = variantesCreadas
        .map((variante, i) => ({
          variante_id: variante.id,
          sucursal_id: sucursal.id,
          tipo: "ingreso_compra" as const,
          cantidad: producto.variantes[i].stock,
          motivo: "Importación desde KIBOO",
        }))
        .filter((m) => m.cantidad > 0);

      if (movimientos.length > 0) {
        await supabase.from("movimientos_stock").insert(movimientos);
      }

      resultados.push({ nombre: producto.nombre, ok: true });
    } catch (error) {
      resultados.push({
        nombre: producto.nombre,
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({ resultados });
}
