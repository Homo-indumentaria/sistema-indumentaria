import { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "peligro";

const estilos: Record<Variante, string> = {
  primario:
    "bg-[var(--color-acento)] text-white hover:opacity-90 focus-visible:outline-[var(--color-acento)]",
  secundario:
    "bg-white text-[var(--color-texto)] border border-[var(--color-borde)] hover:bg-[var(--color-fondo)] focus-visible:outline-[var(--color-acento)]",
  peligro:
    "bg-transparent text-[var(--color-alerta)] hover:bg-[var(--color-alerta-suave)] focus-visible:outline-[var(--color-alerta)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

export function Button({ variante = "primario", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}
