"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/modules/compartido/components/Badge";

export function EncabezadoApp() {
  const router = useRouter();
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
        <span className="font-[var(--fuente-display)] text-lg font-semibold">
          Indumentaria — Gestión
        </span>
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
