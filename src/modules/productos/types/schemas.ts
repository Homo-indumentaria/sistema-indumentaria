import { z } from "zod";

/**
 * Una variante es talle + color con su costo. El precio de venta es
 * opcional en el formulario: si no se especifica, se calcula con el
 * margen del producto (ver calcularPrecioVenta en lib/precios.ts).
 */
export const varianteSchema = z.object({
  id: z.string().uuid().optional(),
  talle: z.string().min(1, "El talle es obligatorio"),
  color: z.string().min(1, "El color es obligatorio"),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo"),
  precio_venta: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .optional(),
  stock_inicial: z.coerce.number().int().min(0).default(0),
  stock_minimo: z.coerce.number().int().min(0).default(0),
});

export const productoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  marca_id: z.string().uuid().nullable().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  margen_default: z.coerce
    .number()
    .min(0, "El margen no puede ser negativo")
    .max(1000, "Revisá el margen, parece muy alto")
    .optional(),
  variantes: z
    .array(varianteSchema)
    .min(1, "Agregá al menos una variante (talle y color)"),
});

export type VarianteInput = z.infer<typeof varianteSchema>;
export type ProductoInput = z.infer<typeof productoSchema>;
