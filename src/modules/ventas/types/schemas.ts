import { z } from "zod";

export const itemVentaSchema = z.object({
  variante_id: z.string().uuid(),
  cantidad: z.coerce.number().int().min(1),
});

export const crearVentaSchema = z.object({
  medio_pago: z.enum(["efectivo", "transferencia", "debito", "credito", "qr"]),
  items: z.array(itemVentaSchema).min(1, "La venta necesita al menos un ítem"),
});

export type CrearVentaInput = z.infer<typeof crearVentaSchema>;
