"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Trash2, Search } from "lucide-react";
import { Button } from "@/modules/compartido/components/Button";
import {
  DESCUENTO_POR_MEDIO_PAGO,
  ETIQUETA_MEDIO_PAGO,
  MedioPago,
} from "@/modules/ventas/lib/reglasNegocio";

interface ItemCarrito {
  variante_id: string;
  codigo_interno: string;
  nombre: string;
  talle: string;
  color: string;
  precio_venta: number;
  stockDisponible: number;
  cantidad: number;
}

export default function VentasPage() {
  const [codigo, setCodigo] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState<{
    numero_venta: number;
    total: number;
    requiere_factura: boolean;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function buscarYAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/variantes/buscar?codigo=${encodeURIComponent(codigo.trim())}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se encontró el producto");
        return;
      }
      const v = json.data;
      const stock = Array.isArray(v.stock) ? v.stock[0] : v.stock;
      const stockDisponible = stock?.cantidad ?? 0;

      setCarrito((prev) => {
        const existente = prev.find((item) => item.variante_id === v.id);
        if (existente) {
          return prev.map((item) =>
            item.variante_id === v.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          );
        }
        return [
          ...prev,
          {
            variante_id: v.id,
            codigo_interno: v.codigo_interno,
            nombre: v.producto?.nombre ?? "",
            talle: v.talle,
            color: v.color,
            precio_venta: v.precio_venta,
            stockDisponible,
            cantidad: 1,
          },
        ];
      });
      setCodigo("");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBuscando(false);
      inputRef.current?.focus();
    }
  }

  function cambiarCantidad(variante_id: string, cantidad: number) {
    if (cantidad < 1) return;
    setCarrito((prev) =>
      prev.map((item) =>
        item.variante_id === variante_id ? { ...item, cantidad } : item
      )
    );
  }

  function quitarItem(variante_id: string) {
    setCarrito((prev) => prev.filter((item) => item.variante_id !== variante_id));
  }

  const subtotal = carrito.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0);
  const descuentoPorcentaje = DESCUENTO_POR_MEDIO_PAGO[medioPago];
  const total = subtotal * (1 - descuentoPorcentaje / 100);

  async function cobrar() {
    setCobrando(true);
    setError(null);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medio_pago: medioPago,
          items: carrito.map((i) => ({
            variante_id: i.variante_id,
            cantidad: i.cantidad,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo registrar la venta");
        return;
      }
      setVentaConfirmada(json.data);
      setCarrito([]);
      setMedioPago("efectivo");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCobrando(false);
    }
  }

  if (ventaConfirmada) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-[var(--color-acento)]/30 bg-[var(--color-acento-suave)] p-8">
          <p className="text-sm text-[var(--color-texto-suave)]">
            Venta #{ventaConfirmada.numero_venta}
          </p>
          <p className="my-3 text-3xl font-semibold text-[var(--color-acento)]">
            ${ventaConfirmada.total.toLocaleString("es-AR")}
          </p>
          {ventaConfirmada.requiere_factura && (
            <p className="text-sm text-[var(--color-texto-suave)]">
              Queda pendiente de facturar (se emitirá cuando esté conectada
              la facturación electrónica).
            </p>
          )}
        </div>
        <Button className="mt-6 w-full" onClick={() => setVentaConfirmada(null)}>
          Nueva venta
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
          Punto de venta
        </h1>
        <Link
          href="/ventas/historial"
          className="text-sm font-medium text-[var(--color-acento)] hover:underline"
        >
          Ver historial
        </Link>
      </div>

      <form onSubmit={buscarYAgregar} className="mb-6 flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código del producto (ej: PRD-000001)"
          className="flex-1 rounded-lg border border-[var(--color-borde)] px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
        />
        <Button type="submit" disabled={buscando}>
          <Search size={18} />
        </Button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-[var(--color-alerta-suave)] px-3 py-2 text-sm text-[var(--color-alerta)]">
          {error}
        </p>
      )}

      <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white">
        {carrito.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-texto-suave)]">
            Escaneá o tipeá un código para empezar la venta.
          </p>
        ) : (
          carrito.map((item) => (
            <div
              key={item.variante_id}
              className="flex items-center justify-between gap-3 border-b border-[var(--color-borde)] p-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.nombre}</p>
                <p className="text-xs text-[var(--color-texto-suave)]">
                  {item.talle} / {item.color} · {item.codigo_interno} ·{" "}
                  ${item.precio_venta.toLocaleString("es-AR")} c/u
                </p>
              </div>
              <input
                type="number"
                min={1}
                value={item.cantidad}
                onChange={(e) =>
                  cambiarCantidad(item.variante_id, Number(e.target.value))
                }
                className="w-16 rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-center text-sm"
              />
              <p className="w-24 text-right font-medium">
                ${(item.precio_venta * item.cantidad).toLocaleString("es-AR")}
              </p>
              <button
                onClick={() => quitarItem(item.variante_id)}
                className="rounded-lg p-2 text-[var(--color-alerta)] hover:bg-[var(--color-alerta-suave)]"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </section>

      {carrito.length > 0 && (
        <section className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Medio de pago
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ETIQUETA_MEDIO_PAGO) as MedioPago[]).map((mp) => (
                <button
                  key={mp}
                  onClick={() => setMedioPago(mp)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    medioPago === mp
                      ? "border-[var(--color-acento)] bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                      : "border-[var(--color-borde)] text-[var(--color-texto-suave)]"
                  }`}
                >
                  {ETIQUETA_MEDIO_PAGO[mp]}
                  {DESCUENTO_POR_MEDIO_PAGO[mp] > 0 &&
                    ` (-${DESCUENTO_POR_MEDIO_PAGO[mp]}%)`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t border-[var(--color-borde)] pt-4 text-sm">
            <div className="flex justify-between text-[var(--color-texto-suave)]">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString("es-AR")}</span>
            </div>
            {descuentoPorcentaje > 0 && (
              <div className="flex justify-between text-[var(--color-acento)]">
                <span>Descuento {ETIQUETA_MEDIO_PAGO[medioPago]} (-{descuentoPorcentaje}%)</span>
                <span>-${(subtotal - total).toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-lg font-semibold">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR")}</span>
            </div>
          </div>

          <Button className="mt-4 w-full" onClick={cobrar} disabled={cobrando}>
            {cobrando ? "Registrando..." : `Cobrar $${total.toLocaleString("es-AR")}`}
          </Button>
        </section>
      )}
    </main>
  );
}
