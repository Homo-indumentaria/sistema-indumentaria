import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Esta ruta refleja el estado de la caja en tiempo real (si hay una
// abierta o no); nunca debe servirse desde una respuesta cacheada, o el
// punto de venta podría mostrar "caja cerrada" justo después de abrirla.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function obtenerUsuarioIdYSucursal(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .single();

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

  return { sucursalId: sucursal?.id ?? null, usuarioId };
}

// GET /api/caja — devuelve la caja abierta actual (o null si no hay ninguna)
// con los totales acumulados del día para mostrar en pantalla.
export async function GET() {
  const supabase = await createClient();
  const { sucursalId } = await obtenerUsuarioIdYSucursal(supabase);

  if (!sucursalId) {
    return NextResponse.json({ error: "No hay ninguna sucursal activa configurada" }, { status: 500 });
  }

  const { data: caja } = await supabase
    .from("cajas")
    .select("id, fecha_apertura, saldo_inicial, usuario_apertura:usuarios(nombre)")
    .eq("sucursal_id", sucursalId)
    .eq("estado", "abierta")
    .maybeSingle();

  if (!caja) {
    return NextResponse.json({ data: null });
  }

  const { data: ventas } = await supabase
    .from("ventas")
    .select("medio_pago, total")
    .eq("caja_id", caja.id)
    .neq("estado", "anulada");

  const { data: movimientos } = await supabase
    .from("movimientos_caja")
    .select("id, tipo, monto, motivo, fecha")
    .eq("caja_id", caja.id)
    .order("fecha", { ascending: false });

  const totalesPorMedioPago: Record<string, number> = {};
  for (const v of ventas ?? []) {
    totalesPorMedioPago[v.medio_pago] = (totalesPorMedioPago[v.medio_pago] ?? 0) + v.total;
  }

  return NextResponse.json({
    data: { ...caja, totalesPorMedioPago, movimientos: movimientos ?? [] },
  });
}

const abrirCajaSchema = z.object({
  saldo_inicial: z.coerce.number().min(0),
});

// POST /api/caja — abre una caja nueva
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = abrirCajaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sucursalId, usuarioId } = await obtenerUsuarioIdYSucursal(supabase);
  if (!sucursalId) {
    return NextResponse.json({ error: "No hay ninguna sucursal activa configurada" }, { status: 500 });
  }

  const { data: cajaId, error } = await supabase.rpc("abrir_caja", {
    p_sucursal_id: sucursalId,
    p_usuario_id: usuarioId,
    p_saldo_inicial: parsed.data.saldo_inicial,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: cajaId } }, { status: 201 });
}
