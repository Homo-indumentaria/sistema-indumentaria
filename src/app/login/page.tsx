"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/modules/compartido/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (errorLogin) {
      setError("Email o contraseña incorrectos");
      setCargando(false);
      return;
    }

    router.push("/productos");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-fondo)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-borde)] bg-white p-8">
        <h1 className="mb-1 font-[var(--fuente-display)] text-2xl font-semibold">
          Ingresar
        </h1>
        <p className="mb-6 text-sm text-[var(--color-texto-suave)]">
          Sistema de gestión — indumentaria
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-borde)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-acento)]"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--color-alerta-suave)] px-3 py-2 text-sm text-[var(--color-alerta)]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
