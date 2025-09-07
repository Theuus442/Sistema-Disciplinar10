interface Atividade {
  descricao: string;
  tempo: string;
}

const dadosAtividades: Atividade[] = [
  { descricao: "Atualizou as configurações de segurança", tempo: "Há 10 minutos" },
  { descricao: "Criou o usuário 'Beatriz Alves'", tempo: "Há 30 minutos" },
  { descricao: "Gerou o relatório de acessos", tempo: "Há 1 hora e 15 minutos" },
  { descricao: "Aprovou a requisição de acesso de 'Rafael Santos'", tempo: "Há 3 horas" },
  { descricao: "Realizou manutenção programada", tempo: "Há 5 horas" },
];

export default function AtividadesRecentes() {
  return (
    <div className="min-h-[330px] w-full max-w-[363px] rounded-[10px] bg-white p-6 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-roboto text-lg font-bold text-sis-dark-text">
          Atividades Recentes
        </h3>
      </div>

      {/* Lista de atividades */}
      <div className="mb-6 space-y-6">
        {dadosAtividades.map((atividade, index) => (
          <div key={index} className="space-y-1">
            <div className="font-roboto text-sm text-sis-dark-text">
              {atividade.descricao}
            </div>
            <div className="font-roboto text-xs text-sis-secondary-text">
              {atividade.tempo}
            </div>
          </div>
        ))}
      </div>

      {/* Botão Ver Todas */}
      <div className="flex items-center space-x-5">
        <button className="flex items-center space-x-2 text-sis-blue hover:underline">
          <span className="font-roboto text-sm font-medium">Ver Todas</span>
          <svg
            className="h-4 w-4"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.69 7.33C13.0601 7.33 13.36 7.62996 13.36 8C13.36 8.37004 13.0601 8.67 12.69 8.67L3.31001 8.67C2.93999 8.67 2.64001 8.37004 2.64001 8C2.64001 7.62996 2.93999 7.33 3.31001 7.33L12.69 7.33Z" fill="currentColor"/>
            <path d="M7.51132 2.83629C7.75661 2.59099 8.14454 2.57585 8.40771 2.79049L8.45877 2.83629L13.1488 7.52631C13.4104 7.78795 13.4104 8.21206 13.1488 8.47369L8.45877 13.1637C8.19713 13.4254 7.77296 13.4254 7.51132 13.1637C7.24969 12.9021 7.24969 12.4779 7.51132 12.2163L11.7276 8L7.51132 3.78371L7.46556 3.73268C7.25089 3.46952 7.26603 3.08159 7.51132 2.83629Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
