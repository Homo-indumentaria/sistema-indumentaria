"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus } from "lucide-react";
import { z } from "zod";
import { productoSchema } from "@/modules/productos/types/schemas";

type FormularioEntrada = z.input<typeof productoSchema>;
type FormularioSalida = z.output<typeof productoSchema>;
import { calcularPrecioVenta } from "@/modules/productos/lib/precios";
import { Button } from "@/modules/compartido/components/Button";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormularioEntrada, unknown, FormularioSalida>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: "",
      margen_default: 100,
      variantes: [{ talle: "", color: "", costo: 0, stock_inicial: 0, stock_minimo: 2 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variantes",
  });

  const margen = watch("margen_default") ?? 0;

  async function onSubmit(datos: FormularioSalida) {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorEnvio(json.error ?? "No se pudo guardar el producto");
        return;
      }
      router.push("/productos");
    } catch {
      setErrorEnvio("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 font-[var(--fuente-display)] text-2xl font-semibold">
        Nuevo producto
      </h1>
      <p className="mb-6 text-sm text-[var(--color-texto-suave)]">
        Cargá el producto y sus variantes por talle y color. El código interno
        de cada variante se genera automáticamente al guardar.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-[var(--color-texto-suave)]">
            Datos generales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input
                {...register("nombre")}
                placeholder="Ej: Remera Lacoste Piqué"
                className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-[var(--color-alerta)]">
                  {errors.nombre.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Margen sugerido (%)
              </label>
              <input
                type="number"
                step="1"
                {...register("margen_default")}
                className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
              />
              <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
                Se usa para calcular el precio de venta si no lo indicás manualmente.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-borde)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-texto-suave)]">
              Variantes (talle / color)
            </h2>
            <Button
              type="button"
              variante="secundario"
              onClick={() =>
                append({ talle: "", color: "", costo: 0, stock_inicial: 0, stock_minimo: 2 })
              }
            >
              <Plus size={16} /> Agregar variante
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const costo = watch(`variantes.${index}.costo`) ?? 0;
              const precioSugerido = calcularPrecioVenta(Number(costo) || 0, Number(margen) || 0);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-borde)] p-4 sm:grid-cols-6"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium">Talle</label>
                    <input
                      {...register(`variantes.${index}.talle`)}
                      placeholder="M"
                      className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Color</label>
                    <input
                      {...register(`variantes.${index}.color`)}
                      placeholder="Azul"
                      className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Costo</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`variantes.${index}.costo`)}
                      className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Precio venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`$${precioSugerido}`}
                      {...register(`variantes.${index}.precio_venta`)}
                      onFocus={(e) => {
                        if (!e.target.value) {
                          setValue(`variantes.${index}.precio_venta`, precioSugerido);
                        }
                      }}
                      className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Stock inicial
                    </label>
                    <input
                      type="number"
                      {...register(`variantes.${index}.stock_inicial`)}
                      className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium">
                        Stock mínimo
                      </label>
                      <input
                        type="number"
                        {...register(`variantes.${index}.stock_minimo`)}
                        className="w-full rounded-lg border border-[var(--color-borde)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
                      />
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label="Quitar variante"
                        className="rounded-lg p-2 text-[var(--color-alerta)] hover:bg-[var(--color-alerta-suave)]"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {errors.variantes?.message && (
            <p className="mt-2 text-xs text-[var(--color-alerta)]">
              {errors.variantes.message}
            </p>
          )}
        </section>

        {errorEnvio && (
          <div className="rounded-lg bg-[var(--color-alerta-suave)] px-4 py-2 text-sm text-[var(--color-alerta)]">
            {errorEnvio}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variante="secundario"
            onClick={() => router.push("/productos")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar producto"}
          </Button>
        </div>
      </form>
    </main>
  );
}
