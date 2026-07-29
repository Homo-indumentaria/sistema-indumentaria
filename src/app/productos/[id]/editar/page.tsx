"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Producto } from "@/modules/productos/types/domain";
import { FilaVariante } from "@/modules/productos/components/FilaVariante";
import { Button } from "@/modules/compartido/components/Button";
import { Plus } from "lucide-react";

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [margenDefault, setMargenDefault] = useState(0);
  const [guardandoGeneral, setGuardandoGeneral] = useState(false);

  const [nuevaVariante, setNuevaVariante] = useState({
    talle: "",
    color: "",
    costo: 0,
    stock_inicial: 0,
    stock_minimo: 2,
  });
  const [agregando, setAgregando] = useState(false);
  const [errorNuevaVariante, setErrorNuevaVariante] = useState<string | null>(
    null
  );

  const cargarProducto = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/productos/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar el producto");
        return;
      }
      setProducto(json.data);
      setNombre(json.data.nombre);
      setDescripcion(json.data.descripcion ?? "");
      setMargenDefault(json.data.margen_default ?? 0);
      setError(null);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    const idHandle = setTimeout(cargarProducto, 0);
    return () => clearTimeout(idHandle);
  }, [cargarProducto]);

  async function guardarDatosGenerales() {
    setGuardandoGeneral(true);
    try {
      await fetch(`/api/productos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion,
          margen_default: margenDefault,
        }),
      });
      await cargarProducto();
    } finally {
      setGuardandoGeneral(false);
    }
  }

  async function agregarVariante() {
    if (!nuevaVariante.talle || !nuevaVariante.color) {
      setErrorNuevaVariante("Talle y color son obligatorios");
      return;
    }
    setAgregando(true);
    setErrorNuevaVariante(null);
    try {
      const res = await fetch(`/api/productos/${id}/variantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaVariante),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorNuevaVariante(json.error ?? "No se pudo agregar la variante");
        return;
      }
      setNuevaVariante({
        talle: "",
        color: "",
        costo: 0,
        stock_inicial: 0,
        stock_minimo: 2,
      });
      await cargarProducto();
    } catch {
      setErrorNuevaVariante("No se pudo conectar con el servidor");
    } finally {
      setAgregando(false);
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--color-texto-suave)]">
        Cargando...
      </main>
    );
  }

  if (error || !producto) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-lg bg-[var(--color-alerta-suave)] px-4 py-2 text-sm text-[var(--color-alerta)]">
          {error ?? "Producto no encontrado"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--fuente-display)] text-2xl font-semibold">
            Editar producto
          </h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            {producto.variantes.length} variante(s)
          </p>
        </div>
        <Button variante="secundario" onClick={() => router.push("/productos")}>
          Volver al listado
        </Button>
      </div>

      <section className="mb-6 rounded-xl border border-[var(--color-borde)] bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--color-texto-suave)]">
          Datos generales
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Descripción
            </label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Margen sugerido (%)
            </label>
            <input
              type="number"
              value={margenDefault}
              onChange={(e) => setMargenDefault(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={guardarDatosGenerales} disabled={guardandoGeneral}>
            {guardandoGeneral ? "Guardando..." : "Guardar datos generales"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-borde)] bg-white">
        <h2 className="border-b border-[var(--color-borde)] p-4 text-sm font-medium text-[var(--color-texto-suave)]">
          Variantes
        </h2>
        {producto.variantes.map((variante) => (
          <FilaVariante
            key={variante.id}
            variante={variante}
            onGuardado={cargarProducto}
          />
        ))}

        <div className="border-t border-[var(--color-borde)] bg-[var(--color-fondo)] p-4">
          <h3 className="mb-3 text-sm font-medium">Agregar variante nueva</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input
              placeholder="Talle"
              value={nuevaVariante.talle}
              onChange={(e) =>
                setNuevaVariante({ ...nuevaVariante, talle: e.target.value })
              }
              className="rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Color"
              value={nuevaVariante.color}
              onChange={(e) =>
                setNuevaVariante({ ...nuevaVariante, color: e.target.value })
              }
              className="rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Costo"
              value={nuevaVariante.costo}
              onChange={(e) =>
                setNuevaVariante({
                  ...nuevaVariante,
                  costo: Number(e.target.value),
                })
              }
              className="rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Stock inicial"
              value={nuevaVariante.stock_inicial}
              onChange={(e) =>
                setNuevaVariante({
                  ...nuevaVariante,
                  stock_inicial: Number(e.target.value),
                })
              }
              className="rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm"
            />
            <Button onClick={agregarVariante} disabled={agregando}>
              <Plus size={14} /> {agregando ? "..." : "Agregar"}
            </Button>
          </div>
          {errorNuevaVariante && (
            <p className="mt-2 text-xs text-[var(--color-alerta)]">
              {errorNuevaVariante}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
