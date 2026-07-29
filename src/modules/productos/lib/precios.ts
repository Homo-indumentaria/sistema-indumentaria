/**
 * Calcula el precio de venta sugerido a partir del costo y un margen
 * porcentual (ej: margen 100 significa "duplicar el costo").
 *
 * Se aísla en una función pura, sin dependencias de Next ni de Supabase,
 * para que sea trivial de testear y de reutilizar (ej: en el módulo de
 * ventas, o en un futuro recalculo masivo de precios).
 */
export function calcularPrecioVenta(costo: number, margenPorcentaje: number): number {
  if (costo < 0 || margenPorcentaje < 0) {
    throw new Error("El costo y el margen no pueden ser negativos");
  }
  const precio = costo * (1 + margenPorcentaje / 100);
  // Redondeo a múltiplos de 10 (convención habitual en indumentaria AR
  // para precios "redondos" tipo $12.990). Ajustable si el negocio prefiere
  // otra regla de redondeo.
  return Math.round(precio / 10) * 10;
}
