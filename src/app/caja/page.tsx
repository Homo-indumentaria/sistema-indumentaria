"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/modules/compartido/components/Button";
import { Badge } from "@/modules/compartido/components/Badge";
import { ETIQUETA_MEDIO_PAGO, MedioPago } from "@/modules/ventas/lib/reglasNegocio";

interface MovimientoCaja {
  id: string;
  tipo: "retiro" | "ingreso";
  monto: number;
  motivo: string;
  fecha: string;
}

interface CajaActual {
  id: string;
  fecha_apertura: string;
  saldo_inicial: number;
  usuario_apertura: { nombre: string } | null;
  totalesPorMedioPago: Record<string, number>;
  movimientos: MovimientoCaja[];
}

export default function CajaPage() {
  const [caja, setCaja] = useState<CajaActual | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [saldoInicial, setSaldoInicial] = useState(0);
  const [abriendo, setAbriendo] = useState(false);

  const [tipoMovimiento, setTipoMovimiento] = useState<"retiro" | "ingreso">("retiro");
  const [montoMovimiento, setMontoMovimiento] = useState(0);
  const [motivoMovimiento, setMotivoMovimiento] = useState("");
  const [registrandoMovimiento, setRegistrandoMovimiento] = useState(false);

  const [saldoContado, setSaldoContado] = useState(0);
  const [cerrando, setCerrando] = useState(false);
  const [resultadoCierre, setResultadoCierre] = useState<{
    saldo_final_esperado: number;
    saldo_final_contado: number;
    diferencia: number;
    total_ventas_efectivo: number;
    total_retiros: number;
    total_ingresos: number;
  } | null>(null);

  const cargarCaja = useCallback(async () => {
    const res = await fetch("/api/caja", { cache: "no-store" });
    const json = await res.json();
    setCaja(json.data);
  }, []);

  useEffect(() => {
    const h = setTimeout(cargarCaja, 0);
    return () => clearTimeout(h);
  }, [cargarCaja]);

  async function abrirCaja() {
    setAbriendo(true);
    setError(null);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo_inicial: saldoInicial }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo abrir la caja");
        return;
      }
      await cargarCaja();
    } finally {
      setAbriendo(false);
    }
  }

  async function registrarMovimiento() {
    if (!caja) return;
    setRegistrandoMovimiento(true);
    setError(null);
    try {
      const res = await fetch("/api/caja/movimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja_id: caja.id,
          tipo: tipoMovimiento,
          monto: montoMovimiento,
          motivo: motivoMovimiento,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo registrar el movimiento");
        return;
      }
      setMontoMovimiento(0);
      setMotivoMovimiento("");
      await cargarCaja();
    } finally {
      setRegistrandoMovimiento(false);
    }
  }

  async function cerrarCaja() {
    if (!caja) return;
    setCerrando(true);
    setError(null);
    try {
      const res = await fetch("/api/caja/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caja_id: caja.id, saldo_contado: saldoContado }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo cerrar la caja");
        return;
      }
      setResultadoCierre(json.data);
      setCaja(null);
    } finally {
      setCerrando(false);
    }
  }

  if (caja === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 text-sm text-[var(--color-texto-suave)]">
        Cargando...
      </main>
    );
  }

  if (resultadoCierre) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-[var(--color-borde)] bg-white p-6">
          <h1 className="mb-4 font-[var(--fuente-display)] text-xl font-semibold">
            Caja cerrada
          </h1>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-texto-suave)]">Efectivo esperado</span>
              <span>${resultadoCierre.saldo_final_esperado.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-texto-suave)]">Efectivo contado</span>
              <span>${resultadoCierre.saldo_final_contado.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-borde)] pt-2 text-base font-semibold">
              <span>Diferencia</span>
              <span
                className={
                  resultadoCierre.diferencia === 0
                    ? "text-[var(--color-acento)]"
                    : "text-[var(--color-alerta)]"
                }
              >
                {resultadoCierre.diferencia > 0 ? "+" : ""}
                ${resultadoCierre.diferencia.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={() => setResultadoCierre(null)}>
          Volver a Caja
        </Button>
      </main>
    );
  }

  if (!caja) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-1 font-[var(--fuente-display)] text-2xl font-semibold">
          Abrir caja
        </h1>
        <p className="mb-6 text-sm text-[var(--color-texto-suave)]">
          Ingresá el efectivo con el que arrancás el día.
        </p>
        <div className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <label className="mb-1 block text-sm font-medium">Saldo inicial</label>
          <input
            type="number"
            min={0}
            value={saldoInicial || ""}
            onChange={(e) => setSaldoInicial(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
          />
          {error && (
            <p className="mt-3 text-sm text-[var(--color-alerta)]">{error}</p>
          )}
          <Button className="mt-4 w-full" onClick={abrirCaja} disabled={abriendo}>
            {abriendo ? "Abriendo..." : "Abrir caja"}
          </Button>
        </div>
      </main>
    );
  }

  const totalEfectivo = caja.totalesPorMedioPago["efectivo"] ?? 0;
  const totalRetiros = caja.movimientos
    .filter((m) => m.tipo === "retiro")
    .reduce((acc, m) => acc + m.monto, 0);
  const totalIngresos = caja.movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((acc, m) => acc + m.monto, 0);
  const efectivoEnCaja = caja.saldo_inicial + totalEfectivo + totalIngresos - totalRetiros;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">Caja</h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            Abierta desde las{" "}
            {new Date(caja.fecha_apertura).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {caja.usuario_apertura && ` por ${caja.usuario_apertura.nombre}`}
          </p>
        </div>
        <Link href="/caja/historial" className="text-sm font-medium text-[var(--color-acento)] hover:underline">
          Historial
        </Link>
      </div>

      <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
          Ventas de hoy por medio de pago
        </h2>
        <div className="space-y-1 text-sm">
          {(Object.keys(ETIQUETA_MEDIO_PAGO) as MedioPago[]).map((mp) => (
            <div key={mp} className="flex justify-between">
              <span>{ETIQUETA_MEDIO_PAGO[mp]}</span>
              <span>${(caja.totalesPorMedioPago[mp] ?? 0).toLocaleString("es-AR")}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-[var(--color-borde)] pt-3 text-sm">
          <div className="flex justify-between font-medium">
            <span>Efectivo estimado en caja ahora</span>
            <span>${efectivoEnCaja.toLocaleString("es-AR")}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
            Saldo inicial (${caja.saldo_inicial.toLocaleString("es-AR")}) + ventas en
            efectivo + ingresos − retiros
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
          Registrar retiro o ingreso
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={tipoMovimiento}
            onChange={(e) => setTipoMovimiento(e.target.value as "retiro" | "ingreso")}
            className="rounded-lg border border-[var(--color-borde)] px-2 py-2 text-sm"
          >
            <option value="retiro">Retiro</option>
            <option value="ingreso">Ingreso</option>
          </select>
          <input
            type="number"
            placeholder="Monto"
            value={montoMovimiento || ""}
            onChange={(e) => setMontoMovimiento(Number(e.target.value))}
            className="rounded-lg border border-[var(--color-borde)] px-2 py-2 text-sm"
          />
          <input
            placeholder="Motivo"
            value={motivoMovimiento}
            onChange={(e) => setMotivoMovimiento(e.target.value)}
            className="rounded-lg border border-[var(--color-borde)] px-2 py-2 text-sm sm:col-span-1"
          />
          <Button onClick={registrarMovimiento} disabled={registrandoMovimiento}>
            {registrandoMovimiento ? "..." : "Registrar"}
          </Button>
        </div>

        {caja.movimientos.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {caja.movimientos.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>
                  <Badge variante={m.tipo === "retiro" ? "alerta" : "acento"}>
                    {m.tipo === "retiro" ? "Retiro" : "Ingreso"}
                  </Badge>{" "}
                  {m.motivo}
                </span>
                <span>${m.monto.toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-alerta)]/30 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
          Cerrar caja
        </h2>
        <label className="mb-1 block text-sm font-medium">
          Efectivo contado (contá lo que hay físicamente en la caja)
        </label>
        <input
          type="number"
          min={0}
          value={saldoContado || ""}
          onChange={(e) => setSaldoContado(Number(e.target.value))}
          className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
        />
        {error && <p className="mt-3 text-sm text-[var(--color-alerta)]">{error}</p>}
        <Button variante="peligro" className="mt-4 w-full" onClick={cerrarCaja} disabled={cerrando}>
          {cerrando ? "Cerrando..." : "Cerrar caja"}
        </Button>
      </section>
    </main>
  );
}
