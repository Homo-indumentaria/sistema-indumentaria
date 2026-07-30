export type MedioPago = "efectivo" | "transferencia" | "debito" | "credito" | "qr";

/**
 * Descuentos fijos y conocidos por los clientes, definidos en la Etapa 1
 * del proyecto. Viven acá, en un solo lugar, para que el punto de venta
 * y cualquier otro cálculo (reportes, etc.) nunca queden desincronizados.
 *
 * Si el negocio cambia estos porcentajes en el futuro, se edita una sola
 * vez acá.
 */
export const DESCUENTO_POR_MEDIO_PAGO: Record<MedioPago, number> = {
  efectivo: 20,
  transferencia: 15,
  debito: 0,
  credito: 0,
  qr: 0,
};

export const ETIQUETA_MEDIO_PAGO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
  qr: "QR",
};

/** Efectivo es el único medio de pago que NO requiere factura (Etapa 1). */
export function requiereFactura(medioPago: MedioPago): boolean {
  return medioPago !== "efectivo";
}
