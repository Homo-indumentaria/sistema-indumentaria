"use client";

import { Producto, obtenerStock, tieneStockBajo } from "@/modules/productos/types/domain";
import { Badge } from "@/modules/compartido/components/Badge";

export function AlertasStock({ productos }: { productos: Producto[] }) {
  const variantesConAlerta = productos.flatMap((producto) =>
    producto.variantes
      .filter((v) => v.activo && tieneStockBajo(v))
      .map((variante) => ({ producto, variante }))
  );

  if (variantesConAlerta.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4 text-sm text-[var(--color-texto-suave)]">
        Sin alertas de stock mínimo por ahora.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-alerta)]/30 bg-[var(--color-alerta-suave)] p-4">
      <h2 className="mb-3 font-medium text-[var(--color-alerta)]">
        Stock mínimo ({variantesConAlerta.length})
      </h2>
      <ul className="space-y-2">
        {variantesConAlerta.map(({ producto, variante }) => {
          const { cantidad, stock_minimo } = obtenerStock(variante.stock);
          return (
            <li
              key={variante.id}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{producto.nombre}</span>
                <span className="text-[var(--color-texto-suave)]">
                  {" "}
                  — {variante.talle} / {variante.color}
                </span>
              </div>
              <Badge variante="alerta">
                {cantidad} en stock (mín. {stock_minimo})
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
