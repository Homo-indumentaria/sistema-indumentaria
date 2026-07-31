"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/modules/compartido/components/Badge";

interface CajaHistorial {
  id: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  saldo_inicial: number;
  saldo_final_contado: number | null;
  saldo_final_esperado: number | null;
  diferencia: number | null;
  estado: "abierta" | "cerrada";
  usuario_apertura: { nombre: string } | null;
  usuario_cierre: { nombre: string } | null;
}

export default function HistorialCajaPage() {
  const [cajas, setCajas] = useState<CajaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const h = setTimeout(() => {
      fetch("/api/caja/historial")
        .then((res) => res.json())
        .then((json) => setCajas(json.data ?? []))
        .finally(() => setCargando(false));
    }, 0);
    return () => clearTimeout(h);
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
          Historial de caja
        </h1>
        <Link href="/caja" className="text-sm font-medium text-[var(--color-acento)] hover:underline">
          Volver a Caja
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-borde)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-borde)] bg-[var(--color-fondo)] text-left text-[var(--color-texto-suave)]">
              <tr>
                <th className="px-4 py-3 font-medium">Apertura</th>
                <th className="px-4 py-3 font-medium">Cierre</th>
                <th className="px-4 py-3 font-medium">Esperado</th>
                <th className="px-4 py-3 font-medium">Contado</th>
                <th className="px-4 py-3 font-medium">Diferencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cajas.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="px-4 py-3">
                    {new Date(c.fecha_apertura).toLocaleString("es-AR")}
                    {c.usuario_apertura && (
                      <span className="text-[var(--color-texto-suave)]"> · {c.usuario_apertura.nombre}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString("es-AR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.saldo_final_esperado != null
                      ? `$${c.saldo_final_esperado.toLocaleString("es-AR")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.saldo_final_contado != null
                      ? `$${c.saldo_final_contado.toLocaleString("es-AR")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.diferencia != null ? (
                      <Badge variante={c.diferencia === 0 ? "acento" : "alerta"}>
                        {c.diferencia > 0 ? "+" : ""}
                        ${c.diferencia.toLocaleString("es-AR")}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.estado === "abierta" ? (
                      <Badge variante="acento">Abierta</Badge>
                    ) : (
                      <Badge variante="neutro">Cerrada</Badge>
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
