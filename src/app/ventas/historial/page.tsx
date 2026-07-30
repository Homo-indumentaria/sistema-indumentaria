"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/modules/compartido/components/Badge";
import { ETIQUETA_MEDIO_PAGO, MedioPago } from "@/modules/ventas/lib/reglasNegocio";

interface VentaListado {
  id: string;
  numero_venta: number;
  fecha: string;
  medio_pago: MedioPago;
  total: number;
  estado: "completada" | "anulada" | "con_cambio";
  requiere_factura: boolean;
  estado_factura: "no_aplica" | "pendiente" | "emitida" | "error";
  usuario: { nombre: string } | null;
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<VentaListado[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const idHandle = setTimeout(() => {
      fetch("/api/ventas")
        .then((res) => res.json())
        .then((json) => setVentas(json.data ?? []))
        .finally(() => setCargando(false));
    }, 0);
    return () => clearTimeout(idHandle);
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
          Historial de ventas
        </h1>
        <Link
          href="/ventas"
          className="text-sm font-medium text-[var(--color-acento)] hover:underline"
        >
          Volver al punto de venta
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-borde)] p-8 text-center text-sm text-[var(--color-texto-suave)]">
          Todavía no hay ventas registradas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-borde)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-borde)] bg-[var(--color-fondo)] text-left text-[var(--color-texto-suave)]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Medio de pago</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Factura</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr
                  key={v.id}
                  className="cursor-pointer border-b border-[var(--color-borde)] last:border-0 hover:bg-[var(--color-fondo)]"
                >
                  <td className="px-4 py-3">
                    <Link href={`/ventas/${v.id}`} className="block">
                      {v.numero_venta}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(v.fecha).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">{ETIQUETA_MEDIO_PAGO[v.medio_pago]}</td>
                  <td className="px-4 py-3">${v.total.toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3">
                    {v.estado === "con_cambio" ? (
                      <Badge variante="alerta">Con cambio</Badge>
                    ) : v.estado === "anulada" ? (
                      <Badge variante="alerta">Anulada</Badge>
                    ) : (
                      <Badge variante="acento">Completada</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.estado_factura === "no_aplica" ? (
                      <span className="text-[var(--color-texto-suave)]">—</span>
                    ) : v.estado_factura === "pendiente" ? (
                      <Badge variante="neutro">Pendiente</Badge>
                    ) : v.estado_factura === "emitida" ? (
                      <Badge variante="acento">Emitida</Badge>
                    ) : (
                      <Badge variante="alerta">Error</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
