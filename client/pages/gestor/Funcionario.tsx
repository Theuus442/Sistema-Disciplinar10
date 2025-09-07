import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  funcionariosMock,
  type Funcionario,
  type Classificacao,
} from "@/data/funcionarios";

const getClassificacaoClasses = (c: Classificacao) => {
  switch (c) {
    case "Leve":
      return "bg-status-green-bg border-status-green-border text-status-green-text";
    case "Média":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
    case "Grave":
      return "bg-red-100 border-red-200 text-red-800";
    case "Gravíssima":
      return "bg-red-200 border-red-300 text-red-900";
  }
};

export default function FuncionarioPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const id = params.id;

  const funcionario: Funcionario | undefined = useMemo(() => {
    if (!id) return funcionariosMock[0];
    return funcionariosMock.find((f) => f.id === id) ?? funcionariosMock[0];
  }, [id]);

  const handleSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar onSair={handleSair} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={() => navigate("/gestor/registrar")} />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Seção 1: Dados de Identificação */}
            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Dados de Identificação do Funcionário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-sis-secondary-text">Nome Completo</p>
                    <p className="font-medium text-sis-dark-text">{funcionario.nomeCompleto}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sis-secondary-text">Matrícula</p>
                    <p className="font-medium text-sis-dark-text">{funcionario.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sis-secondary-text">Cargo</p>
                    <p className="font-medium text-sis-dark-text">{funcionario.cargo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sis-secondary-text">Setor/Departamento</p>
                    <p className="font-medium text-sis-dark-text">{funcionario.setor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sis-secondary-text">Gestor Direto</p>
                    <p className="font-medium text-sis-dark-text">{funcionario.gestorDireto}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 2: Histórico de Registros */}
            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Histórico de Registros Disciplinares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-sis-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[16%]">Data da Ocorrência</TableHead>
                        <TableHead className="w-[28%]">Tipo de Desvio</TableHead>
                        <TableHead className="w-[16%]">Classificação</TableHead>
                        <TableHead className="w-[24%]">Medida Aplicada</TableHead>
                        <TableHead className="w-[16%]">Status do Processo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcionario.historico.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.dataOcorrencia}</TableCell>
                          <TableCell className="truncate">{r.tipoDesvio}</TableCell>
                          <TableCell>
                            <Badge className={`border ${getClassificacaoClasses(r.classificacao)}`}>
                              {r.classificacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="truncate">{r.medidaAplicada}</TableCell>
                          <TableCell>{r.status}</TableCell>
                        </TableRow>
                      ))}
                      {funcionario.historico.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            Nenhum registro disciplinar encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
                  <Button onClick={() => navigate("/gestor/processos")}>Ir para Processos</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
