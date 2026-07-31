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
// nombre. Se procesa en una única llamada a la base (función
// corregir_precios_masivo) para no depender de cientos de round-trips de
// red, que en archivos grandes superaban el límite de tiempo de las
// funciones serverless.
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

  const { data, error } = await supabase.rpc("corregir_precios_masivo", {
    p_items: parsed.data.productos,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
