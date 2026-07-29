"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  parsearListadoProductos,
  parsearInventarioYcruzar,
  ProductoImportado,
} from "@/modules/productos/lib/importadorKiboo";
import { Button } from "@/modules/compartido/components/Button";
import { Badge } from "@/modules/compartido/components/Badge";
import { AlertTriangle } from "lucide-react";

type Resultado = { nombre: string; ok: boolean; error?: string };

export default function ImportarProductosPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoImportado[] | null>(null);
  const [categoriasExcluidas, setCategoriasExcluidas] = useState<Set<string>>(
    new Set()
  );
  const [procesando, setProcesando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleArchivos(
    listadoFile: File | undefined,
    inventarioFile: File | undefined
  ) {
    if (!listadoFile || !inventarioFile) return;
    setError(null);
    try {
      const [bufferListado, bufferInventario] = await Promise.all([
        listadoFile.arrayBuffer(),
        inventarioFile.arrayBuffer(),
      ]);
      const listado = parsearListadoProductos(bufferListado);
      const cruzados = parsearInventarioYcruzar(bufferInventario, listado);
      setProductos(cruzados);
    } catch {
      setError(
        "No se pudo leer alguno de los archivos. Confirmá que sean los .xlsx exportados de KIBOO."
      );
    }
  }

  const categoriasDisponibles = productos
    ? Array.from(new Set(productos.map((p) => p.categoria ?? "Sin categoría")))
    : [];

  const productosAImportar = (productos ?? []).filter(
    (p) => !categoriasExcluidas.has(p.categoria ?? "Sin categoría")
  );

  const totalVariantes = productosAImportar.reduce(
    (acc, p) => acc + p.variantes.length,
    0
  );
  const conStockNegativo = productosAImportar.filter((p) =>
    p.variantes.some((v) => v.stockOriginalNegativo)
  );
  const sinPrecio = productosAImportar.filter((p) => p.sinPrecioEnListado);

  async function confirmarImportacion() {
    setProcesando(true);
    setError(null);
    try {
      const res = await fetch("/api/productos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: productosAImportar.map((p) => ({
            nombre: p.nombre,
            marca: p.marca,
            categoria: p.categoria,
            costo: p.costo,
            precioVenta: p.precioVenta,
            variantes: p.variantes.map((v) => ({
              talle: v.talle,
              color: v.color,
              stock: v.stock,
            })),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo importar");
        return;
      }
      setResultados(json.resultados);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setProcesando(false);
    }
  }

  function toggleCategoria(categoria: string) {
    setCategoriasExcluidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(categoria)) nuevo.delete(categoria);
      else nuevo.add(categoria);
      return nuevo;
    });
  }

  if (resultados) {
    const exitosos = resultados.filter((r) => r.ok);
    const fallidos = resultados.filter((r) => !r.ok);
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 font-[var(--fuente-display)] text-2xl font-semibold">
          Importación finalizada
        </h1>
        <p className="mb-6 text-sm">
          <Badge variante="acento">{exitosos.length} importados</Badge>{" "}
          {fallidos.length > 0 && (
            <Badge variante="alerta">{fallidos.length} con error</Badge>
          )}
        </p>
        {fallidos.length > 0 && (
          <div className="mb-6 rounded-xl border border-[var(--color-alerta)]/30 bg-[var(--color-alerta-suave)] p-4">
            <h2 className="mb-2 text-sm font-medium text-[var(--color-alerta)]">
              Productos que no se pudieron importar
            </h2>
            <ul className="space-y-1 text-sm">
              {fallidos.map((f) => (
                <li key={f.nombre}>
                  {f.nombre} — {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button onClick={() => router.push("/productos")}>
          Ir al listado de productos
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 font-[var(--fuente-display)] text-2xl font-semibold">
        Importar catálogo desde KIBOO
      </h1>
      <p className="mb-6 text-sm text-[var(--color-texto-suave)]">
        Subí los dos archivos que exportaste de KIBOO: el listado general de
        productos (con costos y precios) y el reporte de inventario (con
        talle y color).
      </p>

      {!productos && (
        <section className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              1. Listado de productos (costos y precios)
            </label>
            <input
              type="file"
              accept=".xlsx"
              id="archivo-listado"
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              2. Inventario (talle, color y stock)
            </label>
            <input
              type="file"
              accept=".xlsx"
              id="archivo-inventario"
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="mb-3 text-sm text-[var(--color-alerta)]">{error}</p>
          )}
          <Button
            onClick={() => {
              const listadoInput = document.getElementById(
                "archivo-listado"
              ) as HTMLInputElement;
              const inventarioInput = document.getElementById(
                "archivo-inventario"
              ) as HTMLInputElement;
              handleArchivos(
                listadoInput.files?.[0],
                inventarioInput.files?.[0]
              );
            }}
          >
            Analizar archivos
          </Button>
        </section>
      )}

      {productos && (
        <>
          <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
              Elegí qué categorías importar
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoriasDisponibles.map((cat) => {
                const excluida = categoriasExcluidas.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategoria(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      excluida
                        ? "border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-suave)] line-through"
                        : "border-[var(--color-acento)] bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
              Hacé clic para excluir categorías que no correspondan (por
              ejemplo, restos de indumentaria femenina).
            </p>
          </section>

          <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-texto-suave)]">
              Resumen de la importación
            </h2>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>{productosAImportar.length}</strong> productos,{" "}
                <strong>{totalVariantes}</strong> variantes (talle/color)
              </li>
              {conStockNegativo.length > 0 && (
                <li className="flex items-center gap-2 text-[var(--color-alerta)]">
                  <AlertTriangle size={14} />
                  {conStockNegativo.length} productos tenían stock negativo en
                  KIBOO (se importan con stock 0; conviene un recuento físico)
                </li>
              )}
              {sinPrecio.length > 0 && (
                <li className="flex items-center gap-2 text-[var(--color-alerta)]">
                  <AlertTriangle size={14} />
                  {sinPrecio.length} productos no tenían costo/precio en el
                  listado (se importan en $0, hay que completarlos a mano)
                </li>
              )}
            </ul>
          </section>

          {error && (
            <p className="mb-4 text-sm text-[var(--color-alerta)]">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setProductos(null)}>
              Volver a elegir archivos
            </Button>
            <Button onClick={confirmarImportacion} disabled={procesando}>
              {procesando
                ? "Importando..."
                : `Confirmar importación (${productosAImportar.length} productos)`}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
