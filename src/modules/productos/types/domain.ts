export interface StockInfo {
  cantidad: number;
  stock_minimo: number;
}

export interface Variante {
  id: string;
  codigo_interno: string;
  talle: string;
  color: string;
  costo: number;
  precio_venta: number;
  activo: boolean;
  stock: StockInfo[] | StockInfo | null;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  margen_default: number | null;
  marca: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string } | null;
  variantes: Variante[];
}

/** Supabase devuelve la relación 1:1 stock a veces como objeto, a veces
 * como array de 1 elemento según la versión del cliente; esta función
 * normaliza ambos casos para que el resto de la UI no tenga que pensarlo. */
export function obtenerStock(stock: Variante["stock"]): StockInfo {
  if (!stock) return { cantidad: 0, stock_minimo: 0 };
  if (Array.isArray(stock)) return stock[0] ?? { cantidad: 0, stock_minimo: 0 };
  return stock;
}

export function tieneStockBajo(variante: Variante): boolean {
  const { cantidad, stock_minimo } = obtenerStock(variante.stock);
  return cantidad <= stock_minimo;
}
