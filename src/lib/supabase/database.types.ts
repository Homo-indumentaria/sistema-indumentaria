/**
 * Tipos de la base de datos.
 *
 * NOTA: cuando el proyecto esté conectado a un Supabase real, estos tipos
 * se pueden regenerar automáticamente con:
 *   npx supabase gen types typescript --project-id <id> > database.types.ts
 * Por ahora se escriben a mano, reflejando exactamente la migración
 * 0001_productos_stock.sql, para poder desarrollar sin depender todavía
 * de un proyecto Supabase creado.
 */

export type RolUsuario = "dueno" | "encargada";
export type TipoMovimientoStock =
  | "ingreso_compra"
  | "venta"
  | "ajuste_manual"
  | "devolucion";
export type MedioPagoVenta = "efectivo" | "transferencia" | "debito" | "credito" | "qr";
export type EstadoVenta = "completada" | "anulada" | "con_cambio";
export type EstadoFacturaVenta = "no_aplica" | "pendiente" | "emitida" | "error";
export type TipoCambioDevolucion = "cambio" | "devolucion";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          auth_user_id: string | null;
          nombre: string;
          email: string;
          rol: RolUsuario;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          nombre: string;
          email: string;
          rol?: RolUsuario;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
        Relationships: [];
      };
      sucursales: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          direccion?: string | null;
          activa?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sucursales"]["Insert"]>;
        Relationships: [];
      };
      marcas: {
        Row: { id: string; nombre: string; created_at: string };
        Insert: { id?: string; nombre: string; created_at?: string };
        Update: { id?: string; nombre?: string; created_at?: string };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          nombre: string;
          categoria_padre_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          categoria_padre_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          marca_id: string | null;
          categoria_id: string | null;
          margen_default: number | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          marca_id?: string | null;
          categoria_id?: string | null;
          margen_default?: number | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["productos"]["Insert"]>;
        Relationships: [];
      };
      variantes_producto: {
        Row: {
          id: string;
          producto_id: string;
          codigo_interno: string;
          talle: string;
          color: string;
          costo: number;
          precio_venta: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          codigo_interno?: string;
          talle: string;
          color: string;
          costo?: number;
          precio_venta?: number;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["variantes_producto"]["Insert"]
        >;
        Relationships: [];
      };
      stock: {
        Row: {
          variante_id: string;
          sucursal_id: string;
          cantidad: number;
          stock_minimo: number;
          updated_at: string;
        };
        Insert: {
          variante_id: string;
          sucursal_id: string;
          cantidad?: number;
          stock_minimo?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock"]["Insert"]>;
        Relationships: [];
      };
      movimientos_stock: {
        Row: {
          id: string;
          variante_id: string;
          sucursal_id: string;
          tipo: TipoMovimientoStock;
          cantidad: number;
          motivo: string | null;
          usuario_id: string | null;
          venta_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variante_id: string;
          sucursal_id: string;
          tipo: TipoMovimientoStock;
          cantidad: number;
          motivo?: string | null;
          usuario_id?: string | null;
          venta_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["movimientos_stock"]["Insert"]
        >;
        Relationships: [];
      };
      ventas: {
        Row: {
          id: string;
          numero_venta: number;
          fecha: string;
          sucursal_id: string;
          usuario_id: string | null;
          medio_pago: MedioPagoVenta;
          descuento_porcentaje: number;
          subtotal: number;
          total: number;
          estado: EstadoVenta;
          requiere_factura: boolean;
          estado_factura: EstadoFacturaVenta;
          created_at: string;
        };
        Insert: {
          id?: string;
          numero_venta?: number;
          fecha?: string;
          sucursal_id: string;
          usuario_id?: string | null;
          medio_pago: MedioPagoVenta;
          descuento_porcentaje?: number;
          subtotal: number;
          total: number;
          estado?: EstadoVenta;
          requiere_factura?: boolean;
          estado_factura?: EstadoFacturaVenta;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ventas"]["Insert"]>;
        Relationships: [];
      };
      venta_items: {
        Row: {
          id: string;
          venta_id: string;
          variante_id: string;
          cantidad: number;
          precio_unitario_venta: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          venta_id: string;
          variante_id: string;
          cantidad: number;
          precio_unitario_venta: number;
          subtotal: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["venta_items"]["Insert"]>;
        Relationships: [];
      };
      cambios_devoluciones: {
        Row: {
          id: string;
          venta_original_id: string;
          tipo: TipoCambioDevolucion;
          variante_devuelta_id: string;
          cantidad_devuelta: number;
          variante_nueva_id: string | null;
          cantidad_nueva: number | null;
          motivo: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          venta_original_id: string;
          tipo: TipoCambioDevolucion;
          variante_devuelta_id: string;
          cantidad_devuelta: number;
          variante_nueva_id?: string | null;
          cantidad_nueva?: number | null;
          motivo?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cambios_devoluciones"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      registrar_venta: {
        Args: {
          p_sucursal_id: string;
          p_usuario_id: string | null;
          p_medio_pago: MedioPagoVenta;
          p_descuento_porcentaje: number;
          p_items: unknown;
        };
        Returns: string;
      };
      registrar_cambio_devolucion: {
        Args: {
          p_venta_original_id: string;
          p_sucursal_id: string;
          p_usuario_id: string | null;
          p_tipo: TipoCambioDevolucion;
          p_variante_devuelta_id: string;
          p_cantidad_devuelta: number;
          p_variante_nueva_id?: string | null;
          p_cantidad_nueva?: number | null;
          p_motivo?: string | null;
        };
        Returns: string;
      };
    };
  };
}
