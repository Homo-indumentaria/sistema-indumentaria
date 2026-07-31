"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/modules/compartido/components/Badge";

export function EncabezadoApp() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? null);
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("auth_user_id", user.id)
        .single();
      setRol(usuario?.rol ?? null);
    });
  }, []);

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--color-borde)] bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-[var(--fuente-display)] text-lg font-semibold">
            Indumentaria — Gestión
          </span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/productos"
              className={
                pathname?.startsWith("/productos")
                  ? "font-medium text-[var(--color-acento)]"
                  : "text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]"
              }
            >
              Productos
            </Link>
            <Link
              href="/ventas"
              className={
                pathname?.startsWith("/ventas")
                  ? "font-medium text-[var(--color-acento)]"
                  : "text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]"
              }
            >
              Ventas
            </Link>
            <Link
              href="/caja"
              className={
                pathname?.startsWith("/caja")
                  ? "font-medium text-[var(--color-acento)]"
                  : "text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]"
              }
            >
              Caja
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && (
            <>
              <span className="text-[var(--color-texto-suave)]">{email}</span>
              {rol && (
                <Badge variante="acento">
                  {rol === "dueno" ? "Dueño" : "Encargada"}
                </Badge>
              )}
            </>
          )}
          <button
            onClick={cerrarSesion}
            className="font-medium text-[var(--color-alerta)] hover:underline"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
