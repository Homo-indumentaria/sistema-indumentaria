"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Producto } from "@/modules/productos/types/domain";
import { TablaProductos } from "@/modules/productos/components/TablaProductos";
import { AlertasStock } from "@/modules/inventario/components/AlertasStock";
import { Button } from "@/modules/compartido/components/Button";

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = busqueda ? `?q=${encodeURIComponent(busqueda)}` : "";

    async function cargarProductos() {
      setCargando(true);
      try {
        const res = await fetch(`/api/productos${params}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.error) {
          setError(json.error);
        } else {
          setProductos(json.data);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("No se pudo cargar el catálogo");
        }
      } finally {
        setCargando(false);
      }
    }

    // Se difiere al siguiente tick para no invocar setState de forma
    // síncrona en el cuerpo del efecto (evita renders en cascada).
    const idHandle = setTimeout(cargarProductos, 0);

    return () => {
      clearTimeout(idHandle);
      controller.abort();
    };
  }, [busqueda]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
            Productos y stock
          </h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            Catálogo, variantes por talle/color y control de inventario.
          </p>
        </div>
        <Link href="/productos/nuevo">
          <Button>+ Nuevo producto</Button>
        </Link>
      </header>

      <div className="mb-6">
        <AlertasStock productos={productos} />
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--color-borde)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-alerta-suave)] px-4 py-2 text-sm text-[var(--color-alerta)]">
          {error}. Revisá que las variables de entorno de Supabase estén configuradas.
        </div>
      )}

      {cargando ? (
        <div className="text-sm text-[var(--color-texto-suave)]">Cargando...</div>
      ) : (
        <TablaProductos productos={productos} />
      )}
    </main>
  );
}
