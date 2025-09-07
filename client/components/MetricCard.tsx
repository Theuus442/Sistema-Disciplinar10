import type { ReactNode } from "react";

interface MetricCardProps {
  titulo: string;
  valor: string;
  descricao: string;
  icon: ReactNode;
}

export default function MetricCard({ titulo, valor, descricao, icon }: MetricCardProps) {
  return (
    <div className="flex h-[226px] w-[272px] flex-col rounded-md border border-sis-border bg-white p-10 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      {/* Header com ícone e título */}
      <div className="mb-8 flex items-center justify-between">
        <span className="font-roboto text-sm font-medium text-sis-secondary-text">
          {titulo}
        </span>
        <div className="text-sis-secondary-text">{icon}</div>
      </div>

      {/* Valor principal */}
      <div className="mb-4">
        <span className="font-open-sans text-2xl font-bold text-sis-dark-text">
          {valor}
        </span>
      </div>

      {/* Descrição/Estatística */}
      <div className="mt-auto">
        <span className="font-roboto text-xs text-sis-secondary-text">
          {descricao}
        </span>
      </div>
    </div>
  );
}
