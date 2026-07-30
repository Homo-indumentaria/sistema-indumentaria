"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/modules/compartido/components/Button";
import { Badge } from "@/modules/compartido/components/Badge";
import { ETIQUETA_MEDIO_PAGO, MedioPago } from "@/modules/ventas/lib/reglasNegocio";

interface ItemVenta {
  id: string;
  cantidad: number;
  precio_unitario_venta: number;
  subtotal: number;
  variante: {
    id: string;
    codigo_interno: string;
    talle: string;
    color: string;
    producto: { nombre: string };
  };
}

interface DetalleVenta {
  id: string;
  numero_venta: number;
  fecha: string;
  medio_pago: MedioPago;
  subtotal: number;
  total: number;
  estado: string;
  requiere_factura: boolean;
  estado_factura: string;
  usuario: { nombre: string } | null;
  items: ItemVenta[];
  cambios: {
    id: string;
    tipo: "cambio" | "devolucion";
    cantidad_devuelta: number;
    cantidad_nueva: number | null;
    motivo: string | null;
    created_at: string;
    variante_devuelta: { codigo_interno: string; talle: string; color: string };
    variante_nueva: { codigo_interno: string; talle: string; color: string } | null;
  }[];
}

export default function DetalleVentaPage() {
  const { id } = useParams<{ id: string }>();
  const [venta, setVenta] = useState<DetalleVenta | null>(null);
  const [cargando, setCargando] = useState(true);

  const [itemSeleccionado, setItemSeleccionado] = useState<ItemVenta | null>(null);
  const [tipoOperacion, setTipoOperacion] = useState<"cambio" | "devolucion">(
    "devolucion"
  );
  const [cantidadDevuelta, setCantidadDevuelta] = useState(1);
  const [codigoNuevo, setCodigoNuevo] = useState("");
  const [cantidadNueva, setCantidadNueva] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarVenta = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/ventas/${id}`);
    const json = await res.json();
    setVenta(json.data);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    const h = setTimeout(cargarVenta, 0);
    return () => clearTimeout(h);
  }, [cargarVenta]);

  async function confirmarOperacion() {
    if (!itemSeleccionado) return;
    setProcesando(true);
    setErrorForm(null);
    try {
      let variante_nueva_id: string | undefined;
      if (tipoOperacion === "cambio") {
        const resBusqueda = await fetch(
          `/api/variantes/buscar?codigo=${encodeURIComponent(codigoNuevo.trim())}`
        );
        const jsonBusqueda = await resBusqueda.json();
        if (!resBusqueda.ok) {
          setErrorForm(jsonBusqueda.error ?? "No se encontró el producto nuevo");
          setProcesando(false);
          return;
        }
        variante_nueva_id = jsonBusqueda.data.id;
      }

      const res = await fetch(`/api/ventas/${id}/cambio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoOperacion,
          variante_devuelta_id: itemSeleccionado.variante.id,
          cantidad_devuelta: cantidadDevuelta,
          variante_nueva_id,
          cantidad_nueva: tipoOperacion === "cambio" ? cantidadNueva : undefined,
          motivo: motivo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorForm(json.error ?? "No se pudo registrar la operación");
        return;
      }
      setItemSeleccionado(null);
      setCodigoNuevo("");
      setMotivo("");
      await cargarVenta();
    } catch {
      setErrorForm("No se pudo conectar con el servidor");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--color-texto-suave)]">
        Cargando...
      </main>
    );
  }

  if (!venta) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--color-alerta)]">
        No se encontró la venta.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
            Venta #{venta.numero_venta}
          </h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            {new Date(venta.fecha).toLocaleString("es-AR")} ·{" "}
            {ETIQUETA_MEDIO_PAGO[venta.medio_pago]}
            {venta.usuario && ` · ${venta.usuario.nombre}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">
            ${venta.total.toLocaleString("es-AR")}
          </p>
          {venta.estado === "con_cambio" && (
            <Badge variante="alerta">Con cambio</Badge>
          )}
        </div>
      </div>

      <section className="mb-6 overflow-hidden rounded-xl border border-[var(--color-borde)] bg-white">
        {venta.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-[var(--color-borde)] p-4 last:border-0"
          >
            <div>
              <p className="font-medium">{item.variante.producto.nombre}</p>
              <p className="text-xs text-[var(--color-texto-suave)]">
                {item.variante.talle} / {item.variante.color} ·{" "}
                {item.variante.codigo_interno} · x{item.cantidad}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-medium">${item.subtotal.toLocaleString("es-AR")}</p>
              <Button
                variante="secundario"
                onClick={() => {
                  setItemSeleccionado(item);
                  setCantidadDevuelta(1);
                  setErrorForm(null);
                }}
              >
                Cambio/Devolución
              </Button>
            </div>
          </div>
        ))}
      </section>

      {venta.cambios.length > 0 && (
        <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
            Cambios y devoluciones registrados
          </h2>
          <ul className="space-y-2 text-sm">
            {venta.cambios.map((c) => (
              <li key={c.id}>
                <Badge variante={c.tipo === "cambio" ? "acento" : "alerta"}>
                  {c.tipo === "cambio" ? "Cambio" : "Devolución"}
                </Badge>{" "}
                {c.cantidad_devuelta}x {c.variante_devuelta.codigo_interno} (
                {c.variante_devuelta.talle}/{c.variante_devuelta.color})
                {c.tipo === "cambio" && c.variante_nueva && (
                  <>
                    {" "}
                    → {c.cantidad_nueva}x {c.variante_nueva.codigo_interno} (
                    {c.variante_nueva.talle}/{c.variante_nueva.color})
                  </>
                )}
                {c.motivo && (
                  <span className="text-[var(--color-texto-suave)]"> — {c.motivo}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {itemSeleccionado && (
        <section className="rounded-xl border border-[var(--color-acento)]/30 bg-[var(--color-acento-suave)] p-5">
          <h2 className="mb-3 font-medium">
            Registrar cambio/devolución — {itemSeleccionado.variante.producto.nombre}{" "}
            ({itemSeleccionado.variante.talle}/{itemSeleccionado.variante.color})
          </h2>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setTipoOperacion("devolucion")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                tipoOperacion === "devolucion"
                  ? "border-[var(--color-acento)] bg-white text-[var(--color-acento)]"
                  : "border-transparent text-[var(--color-texto-suave)]"
              }`}
            >
              Devolución
            </button>
            <button
              onClick={() => setTipoOperacion("cambio")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                tipoOperacion === "cambio"
                  ? "border-[var(--color-acento)] bg-white text-[var(--color-acento)]"
                  : "border-transparent text-[var(--color-texto-suave)]"
              }`}
            >
              Cambio por otro producto
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Cantidad a devolver
              </label>
              <input
                type="number"
                min={1}
                max={itemSeleccionado.cantidad}
                value={cantidadDevuelta}
                onChange={(e) => setCantidadDevuelta(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-sm"
              />
            </div>
            {tipoOperacion === "cambio" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Código del producto nuevo
                  </label>
                  <input
                    value={codigoNuevo}
                    onChange={(e) => setCodigoNuevo(e.target.value)}
                    placeholder="PRD-000002"
                    className="w-full rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Cantidad nueva
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cantidadNueva}
                    onChange={(e) => setCantidadNueva(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Motivo (opcional)
              </label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {errorForm && (
            <p className="mb-3 text-sm text-[var(--color-alerta)]">{errorForm}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variante="secundario" onClick={() => setItemSeleccionado(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarOperacion} disabled={procesando}>
              {procesando ? "Procesando..." : "Confirmar"}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
