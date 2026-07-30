import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const itemSchema = z.object({
  nombre: z.string().min(1),
  costo: z.coerce.number().min(0),
  precioVenta: z.coerce.number().min(0),
});

const bodySchema = z.object({
  productos: z.array(itemSchema),
});

// POST /api/productos/corregir-precios — actualiza costo y precio_venta
// de TODAS las variantes de los productos existentes que coincidan por
// nombre, sin crear productos nuevos ni tocar el stock. Pensado para
// corregir importaciones previas donde el precio quedó mal cargado, o
// para actualizar precios cuando cambian en KIBOO.
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

  const resultados: { nombre: string; ok: boolean; variantesActualizadas?: number; error?: string }[] = [];

  for (const item of parsed.data.productos) {
    try {
      const { data: producto, error: errorBusqueda } = await supabase
        .from("productos")
        .select("id")
        .eq("nombre", item.nombre)
        .maybeSingle();

      if (errorBusqueda) throw new Error(errorBusqueda.message);
      if (!producto) {
        resultados.push({ nombre: item.nombre, ok: false, error: "No existe ese producto en el sistema" });
        continue;
      }

      const { data: actualizadas, error: errorUpdate } = await supabase
        .from("variantes_producto")
        .update({ costo: item.costo, precio_venta: item.precioVenta })
        .eq("producto_id", producto.id)
        .select("id");

      if (errorUpdate) throw new Error(errorUpdate.message);

      resultados.push({
        nombre: item.nombre,
        ok: true,
        variantesActualizadas: actualizadas?.length ?? 0,
      });
    } catch (error) {
      resultados.push({
        nombre: item.nombre,
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({ resultados });
}
