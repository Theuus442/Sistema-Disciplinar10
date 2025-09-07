import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { processosMock } from "@/data/processos";

export default function ProcessoAcompanhamento() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id as string;

  const processo = useMemo(
    () => processosMock.find((p) => p.id === id),
    [id],
  );

  const handleSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar onSair={handleSair} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={() => navigate("/gestor/registrar")} userType="gestor" />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl">
            {!processo ? (
              <div className="space-y-4 rounded-md border border-sis-border bg-white p-6">
                <h1 className="font-open-sans text-2xl font-bold text-sis-dark-text">
                  Processo não encontrado
                </h1>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Voltar
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                    Acompanhamento do Processo
                  </h1>
                  <p className="font-roboto text-sis-secondary-text">
                    Informações gerais e etapas do processo selecionado.
                  </p>
                </div>

                <div className="rounded-md border border-sis-border bg-white p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-sis-secondary-text">ID</p>
                      <p className="font-medium text-sis-dark-text">{processo.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sis-secondary-text">Funcionário</p>
                      <p className="font-medium text-sis-dark-text">{processo.funcionario}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sis-secondary-text">Tipo de Desvio</p>
                      <p className="font-medium text-sis-dark-text">{processo.tipoDesvio}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sis-secondary-text">Classificação</p>
                      <p className="font-medium text-sis-dark-text">{processo.classificacao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sis-secondary-text">Data de Abertura</p>
                      <p className="font-medium text-sis-dark-text">{processo.dataAbertura}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sis-secondary-text">Status Atual</p>
                      <p className="font-medium text-sis-dark-text">{processo.status}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    Voltar
                  </Button>
                  <Button onClick={() => navigate(`/gestor/processos`)}>
                    Ir para Lista de Processos
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
