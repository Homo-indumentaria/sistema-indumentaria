import { ReactNode } from "react";

type Variante = "neutro" | "acento" | "alerta";

const estilos: Record<Variante, string> = {
  neutro: "bg-[var(--color-borde)] text-[var(--color-texto-suave)]",
  acento: "bg-[var(--color-acento-suave)] text-[var(--color-acento)]",
  alerta: "bg-[var(--color-alerta-suave)] text-[var(--color-alerta)]",
};

export function Badge({
  children,
  variante = "neutro",
}: {
  children: ReactNode;
  variante?: Variante;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estilos[variante]}`}
    >
      {children}
    </span>
  );
}
