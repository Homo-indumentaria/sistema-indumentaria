import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/variantes/buscar?codigo=PRD-000001
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo")?.trim();
  if (!codigo) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variantes_producto")
    .select(
      `
      id, codigo_interno, talle, color, precio_venta, activo,
      producto:productos(id, nombre),
      stock(cantidad)
    `
    )
    .eq("codigo_interno", codigo)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: `No se encontró ningún producto con código ${codigo}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
