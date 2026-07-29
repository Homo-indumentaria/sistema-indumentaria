"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Producto, obtenerStock, tieneStockBajo } from "@/modules/productos/types/domain";
import { Badge } from "@/modules/compartido/components/Badge";

export function TablaProductos({ productos }: { productos: Producto[] }) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const router = useRouter();

  if (productos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-borde)] p-8 text-center text-[var(--color-texto-suave)]">
        Todavía no cargaste ningún producto. Empezá con &quot;Nuevo producto&quot;.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-borde)] bg-[var(--color-fondo)] text-left text-[var(--color-texto-suave)]">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Marca</th>
            <th className="px-4 py-3 font-medium">Variantes</th>
            <th className="px-4 py-3 font-medium">Stock total</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => {
            const stockTotal = producto.variantes.reduce(
              (acc, v) => acc + obtenerStock(v.stock).cantidad,
              0
            );
            const hayAlerta = producto.variantes.some(
              (v) => v.activo && tieneStockBajo(v)
            );
            const estaExpandido = expandido === producto.id;

            return (
              <>
                <tr
                  key={producto.id}
                  className="cursor-pointer border-b border-[var(--color-borde)] last:border-0 hover:bg-[var(--color-fondo)]"
                  onClick={() =>
                    setExpandido(estaExpandido ? null : producto.id)
                  }
                >
                  <td className="px-4 py-3 font-medium">{producto.nombre}</td>
                  <td className="px-4 py-3 text-[var(--color-texto-suave)]">
                    {producto.marca?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-texto-suave)]">
                    {producto.variantes.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {stockTotal}
                      {hayAlerta && <Badge variante="alerta">Stock bajo</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/productos/${producto.id}/editar`);
                      }}
                      className="text-sm font-medium text-[var(--color-acento)] hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
                {estaExpandido && (
                  <tr key={`${producto.id}-detalle`}>
                    <td colSpan={5} className="bg-[var(--color-fondo)] px-4 py-3">
                      <table className="w-full text-xs">
                        <thead className="text-left text-[var(--color-texto-suave)]">
                          <tr>
                            <th className="pb-2 pr-4 font-medium">Código</th>
                            <th className="pb-2 pr-4 font-medium">Talle</th>
                            <th className="pb-2 pr-4 font-medium">Color</th>
                            <th className="pb-2 pr-4 font-medium">Costo</th>
                            <th className="pb-2 pr-4 font-medium">Precio venta</th>
                            <th className="pb-2 font-medium">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producto.variantes.map((v) => {
                            const stock = obtenerStock(v.stock);
                            return (
                              <tr key={v.id}>
                                <td className="py-1.5 pr-4 font-mono text-[var(--color-texto-suave)]">
                                  {v.codigo_interno}
                                </td>
                                <td className="py-1.5 pr-4">{v.talle}</td>
                                <td className="py-1.5 pr-4">{v.color}</td>
                                <td className="py-1.5 pr-4">
                                  ${v.costo.toLocaleString("es-AR")}
                                </td>
                                <td className="py-1.5 pr-4">
                                  ${v.precio_venta.toLocaleString("es-AR")}
                                </td>
                                <td className="py-1.5">
                                  {tieneStockBajo(v) ? (
                                    <Badge variante="alerta">
                                      {stock.cantidad}
                                    </Badge>
                                  ) : (
                                    stock.cantidad
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
