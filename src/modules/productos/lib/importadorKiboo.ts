import * as XLSX from "xlsx";

export interface VarianteImportada {
  talle: string;
  color: string;
  stock: number; // ya clampeado a >= 0
  stockOriginalNegativo: boolean; // KIBOO tenía stock negativo (dato inconsistente)
}

export interface ProductoImportado {
  nombre: string;
  marca: string | null;
  categoria: string | null;
  costo: number;
  precioVenta: number;
  sinPrecioEnListado: boolean; // no se encontró en el archivo de Listado de productos
  variantes: VarianteImportada[];
}

interface FilaListado {
  nombre: string;
  costo: number;
  precioVenta: number;
  categoria: string | null;
  marca: string | null;
}

/**
 * Parsea el "Listado de productos" (export general de KIBOO) y arma un
 * diccionario nombre -> costo/precio/categoría/marca, para cruzarlo
 * después con el detalle de talle/color del archivo de Inventario.
 */
export function parsearListadoProductos(buffer: ArrayBuffer): Map<string, FilaListado> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 });

  const resultado = new Map<string, FilaListado>();

  // Fila 0 es encabezado. Columnas conocidas del export de KIBOO:
  // C=Nombre(2), G=Costo Reposición(6), H=Precio A(7), N=Categoria(13), P=Marca(15)
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const nombre = String(fila[2] ?? "").trim();
    if (!nombre) continue;

    resultado.set(nombre, {
      nombre,
      costo: Number(fila[6]) || 0,
      precioVenta: Number(fila[7]) || 0,
      categoria: fila[13] ? String(fila[13]).trim() : null,
      marca: fila[15] ? String(fila[15]).trim() : null,
    });
  }

  return resultado;
}

/**
 * Parsea el reporte de "Inventario" (stock por talle y color) y lo cruza
 * con el diccionario del Listado de productos para completar costo,
 * precio, categoría y marca.
 *
 * El reporte de KIBOO viene en formato "pivot": el nombre del producto y
 * el color solo aparecen en la primera fila de cada grupo de talles (el
 * resto queda en blanco), así que hay que "arrastrar" el último valor
 * visto fila a fila.
 */
export function parsearInventarioYcruzar(
  buffer: ArrayBuffer,
  listado: Map<string, FilaListado>
): ProductoImportado[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 });

  const productos: ProductoImportado[] = [];
  let productoActual: ProductoImportado | null = null;
  let colorActual = "Único";

  for (const fila of filas) {
    const celdaNombre = fila[1] ? String(fila[1]) : null;
    const celdaColor = fila[2] ? String(fila[2]) : null;
    const celdaTalle = fila[3] ? String(fila[3]) : null;

    // Filas de encabezado/totales no tienen "Talle:" ni "Sin Talle" -> se ignoran
    if (!celdaTalle || !/talle/i.test(celdaTalle)) continue;

    if (celdaNombre) {
      // Nueva fila de producto: "NOMBRE - Cód: XXX"
      const nombre = celdaNombre.replace(/\s*-\s*Cód:.*$/i, "").trim();
      const datosListado = listado.get(nombre);

      productoActual = {
        nombre,
        marca: datosListado?.marca ?? null,
        categoria: datosListado?.categoria ?? null,
        costo: datosListado?.costo ?? 0,
        precioVenta: datosListado?.precioVenta ?? 0,
        sinPrecioEnListado: !datosListado,
        variantes: [],
      };
      productos.push(productoActual);
    }

    if (celdaColor) {
      colorActual = /sin color/i.test(celdaColor)
        ? "Único"
        : celdaColor.replace(/^color:\s*/i, "").trim();
    }

    if (!productoActual) continue;

    const talle = /sin talle/i.test(celdaTalle)
      ? "Único"
      : celdaTalle.replace(/^talle:\s*/i, "").trim();

    const stockCrudo = Number(fila[4]) || 0;

    productoActual.variantes.push({
      talle,
      color: colorActual,
      stock: Math.max(stockCrudo, 0),
      stockOriginalNegativo: stockCrudo < 0,
    });
  }

  return productos;
}
