"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parsearListadoProductos } from "@/modules/productos/lib/importadorKiboo";
import { Button } from "@/modules/compartido/components/Button";
import { Badge } from "@/modules/compartido/components/Badge";

type Resultado = {
  nombre: string;
  ok: boolean;
  variantesActualizadas?: number;
  error?: string;
};

export default function CorregirPreciosPage() {
  const router = useRouter();
  const [procesando, setProcesando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setProcesando(true);
    setError(null);
    setResultados(null);
    try {
      const buffer = await archivo.arrayBuffer();
      const listado = parsearListadoProductos(buffer);
      const productos = Array.from(listado.values()).map((p) => ({
        nombre: p.nombre,
        costo: p.costo,
        precioVenta: p.precioVenta,
      }));

      const res = await fetch("/api/productos/corregir-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo corregir los precios");
        return;
      }
      setResultados(json.resultados);
    } catch {
      setError("No se pudo leer el archivo. Confirmá que sea el .xlsx del Listado de productos.");
    } finally {
      setProcesando(false);
    }
  }

  const actualizados = resultados?.filter((r) => r.ok && (r.variantesActualizadas ?? 0) > 0) ?? [];
  const sinCoincidencia = resultados?.filter((r) => !r.ok) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 font-[var(--fuente-display)] text-2xl font-semibold">
        Corregir costos y precios
      </h1>
      <p className="mb-6 text-sm text-[var(--color-texto-suave)]">
        Subí el Listado de productos exportado de KIBOO. Va a actualizar el
        costo y precio de venta de los productos que ya tenés cargados en el
        sistema, cruzando por nombre — no crea productos nuevos ni toca el
        stock.
      </p>

      {!resultados && (
        <section className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleArchivo(e.target.files?.[0])}
            disabled={procesando}
            className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
          />
          {procesando && (
            <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
              Procesando...
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-[var(--color-alerta)]">{error}</p>
          )}
        </section>
      )}

      {resultados && (
        <>
          <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
            <p className="mb-2">
              <Badge variante="acento">{actualizados.length} productos actualizados</Badge>{" "}
              {sinCoincidencia.length > 0 && (
                <Badge variante="alerta">
                  {sinCoincidencia.length} sin coincidencia en el sistema
                </Badge>
              )}
            </p>
          </section>
          <Button onClick={() => router.push("/productos")}>
            Ir al listado de productos
          </Button>
        </>
      )}
    </main>
  );
}
