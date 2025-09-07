import type { ReactNode } from "react";

interface CartaoMetricaProps {
  titulo: string;
  valor: string;
  descricao: string;
  icon: ReactNode;
  corValor?: string;
}

export default function CartaoMetrica({ 
  titulo, 
  valor, 
  descricao, 
  icon,
  corValor = "text-sis-blue"
}: CartaoMetricaProps) {
  return (
    <div className="h-[298px] w-[363px] rounded-[10px] bg-white p-6 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      {/* Header com título e ícone */}
      <div className="mb-8 flex items-center justify-between">
        <h3 className="font-roboto text-lg font-bold text-sis-dark-text">
          {titulo}
        </h3>
        <div className="text-sis-secondary-text">
          {icon}
        </div>
      </div>

      {/* Valor principal */}
      <div className="mb-4">
        <span className={`font-open-sans text-[48px] font-extrabold leading-[60px] ${corValor}`}>
          {valor}
        </span>
      </div>

      {/* Descrição */}
      <div className="mt-auto">
        <span className="font-roboto text-sm text-sis-secondary-text">
          {descricao}
        </span>
      </div>
    </div>
  );
}
