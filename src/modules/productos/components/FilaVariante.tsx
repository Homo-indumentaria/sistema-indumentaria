"use client";

import { useState } from "react";
import { Variante, obtenerStock, tieneStockBajo } from "@/modules/productos/types/domain";
import { Button } from "@/modules/compartido/components/Button";
import { Badge } from "@/modules/compartido/components/Badge";
import { Check, PackagePlus } from "lucide-react";

export function FilaVariante({
  variante,
  onGuardado,
}: {
  variante: Variante;
  onGuardado: () => void;
}) {
  const stock = obtenerStock(variante.stock);
  const [talle, setTalle] = useState(variante.talle);
  const [color, setColor] = useState(variante.color);
  const [costo, setCosto] = useState(variante.costo);
  const [precioVenta, setPrecioVenta] = useState(variante.precio_venta);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [cantidadAjuste, setCantidadAjuste] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [ajustando, setAjustando] = useState(false);
  const [errorAjuste, setErrorAjuste] = useState<string | null>(null);

  const huboCambios =
    talle !== variante.talle ||
    color !== variante.color ||
    costo !== variante.costo ||
    precioVenta !== variante.precio_venta;

  async function guardarCambios() {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/variantes/${variante.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talle, color, costo, precio_venta: precioVenta }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar");
        return;
      }
      onGuardado();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  }

  async function aplicarAjuste() {
    if (cantidadAjuste === 0) {
      setErrorAjuste("Ingresá una cantidad distinta de cero");
      return;
    }
    setAjustando(true);
    setErrorAjuste(null);
    try {
      const res = await fetch("/api/stock/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variante_id: variante.id,
          tipo: "ajuste_manual",
          cantidad: cantidadAjuste,
          motivo: motivoAjuste || "Ajuste manual",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorAjuste(json.error ?? "No se pudo aplicar el ajuste");
        return;
      }
      setMostrarAjuste(false);
      setCantidadAjuste(0);
      setMotivoAjuste("");
      onGuardado();
    } catch {
      setErrorAjuste("No se pudo conectar con el servidor");
    } finally {
      setAjustando(false);
    }
  }

  return (
    <div className="border-b border-[var(--color-borde)] p-3 last:border-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-7 sm:items-center">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Talle
          </label>
          <input
            value={talle}
            onChange={(e) => setTalle(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Color
          </label>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Costo
          </label>
          <input
            type="number"
            step="0.01"
            value={costo}
            onChange={(e) => setCosto(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Precio venta
          </label>
          <input
            type="number"
            step="0.01"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Código
          </label>
          <p className="pt-1.5 font-mono text-xs text-[var(--color-texto-suave)]">
            {variante.codigo_interno}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
            Stock
          </label>
          <p className="pt-1.5 text-sm">
            {tieneStockBajo(variante) ? (
              <Badge variante="alerta">{stock.cantidad}</Badge>
            ) : (
              stock.cantidad
            )}
          </p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variante="secundario"
            onClick={() => setMostrarAjuste(!mostrarAjuste)}
          >
            <PackagePlus size={14} /> Stock
          </Button>
          {huboCambios && (
            <Button onClick={guardarCambios} disabled={guardando}>
              <Check size={14} /> {guardando ? "..." : "Guardar"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[var(--color-alerta)]">{error}</p>
      )}

      {mostrarAjuste && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-[var(--color-fondo)] p-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
              Cantidad (+ ingreso / − egreso)
            </label>
            <input
              type="number"
              value={cantidadAjuste}
              onChange={(e) => setCantidadAjuste(Number(e.target.value))}
              className="w-28 rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[var(--color-texto-suave)]">
              Motivo (ej: recuento físico)
            </label>
            <input
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
          </div>
          <Button onClick={aplicarAjuste} disabled={ajustando}>
            {ajustando ? "Aplicando..." : "Aplicar ajuste"}
          </Button>
          {errorAjuste && (
            <p className="w-full text-xs text-[var(--color-alerta)]">
              {errorAjuste}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
