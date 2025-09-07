interface StatusTag {
  texto: string;
  cor: "amarelo" | "azul" | "roxo" | "verde";
}

interface Processo {
  id: string;
  colaborador: string;
  tipoDesvio: string;
  status: StatusTag;
  dataInicio: string;
  prazo: string;
}

interface TabelaProcessosProps {
  processos: Processo[];
}

const getStatusStyles = (cor: StatusTag["cor"]) => {
  switch (cor) {
    case "amarelo":
      return "bg-[#FEF9C3] border-[#FEF08A] text-[#854D0E]";
    case "azul":
      return "bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]";
    case "roxo":
      return "bg-[#F3E8FF] border-[#E9D5FF] text-[#6B21A8]";
    case "verde":
      return "bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]";
    default:
      return "bg-gray-100 border-gray-300 text-gray-800";
  }
};

export default function TabelaProcessos({ processos }: TabelaProcessosProps) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-sis-border bg-white shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      <div className="p-10">
        {/* Cabeçalho da Seção */}
        <div className="mb-8">
          <h3 className="mb-2 font-open-sans text-xl font-semibold text-sis-dark-text">
            Processos em Andamento da Equipe
          </h3>
          <p className="font-roboto text-sm text-sis-secondary-text">
            Visão geral dos processos disciplinares ativos sob sua gestão.
          </p>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-md">
          <table className="w-full">
            {/* Cabeçalho da Tabela */}
            <thead>
              <tr className="border-b border-sis-border bg-gray-50">
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  ID Processo
                </th>
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  Colaborador
                </th>
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  Tipo de Desvio
                </th>
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  Data Início
                </th>
                <th className="px-4 py-3 text-left font-roboto text-sm font-medium text-sis-dark-text">
                  Prazo
                </th>
              </tr>
            </thead>

            {/* Corpo da Tabela */}
            <tbody>
              {processos.map((processo, index) => (
                <tr
                  key={processo.id}
                  className={`border-b border-sis-border ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-4 font-roboto text-sm font-medium text-sis-dark-text">
                    {processo.id}
                  </td>
                  <td className="px-4 py-4 font-roboto text-sm text-sis-secondary-text">
                    {processo.colaborador}
                  </td>
                  <td className="px-4 py-4 font-roboto text-sm text-sis-secondary-text">
                    {processo.tipoDesvio}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 font-roboto text-xs font-semibold ${getStatusStyles(
                        processo.status.cor
                      )}`}
                    >
                      {processo.status.texto}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-roboto text-sm text-sis-secondary-text">
                    {processo.dataInicio}
                  </td>
                  <td className="px-4 py-4 font-roboto text-sm text-sis-secondary-text">
                    {processo.prazo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
