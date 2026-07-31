import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cajas")
    .select(
      `
      id, fecha_apertura, fecha_cierre, saldo_inicial,
      saldo_final_contado, saldo_final_esperado, diferencia, estado,
      usuario_apertura:usuarios!cajas_usuario_apertura_id_fkey(nombre),
      usuario_cierre:usuarios!cajas_usuario_cierre_id_fkey(nombre)
    `
    )
    .order("fecha_apertura", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
