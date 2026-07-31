import { EncabezadoApp } from "@/modules/compartido/components/EncabezadoApp";

export default function CajaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <EncabezadoApp />
      {children}
    </div>
  );
}
