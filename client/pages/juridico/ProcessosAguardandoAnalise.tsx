import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SidebarJuridico from "@/components/SidebarJuridico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { legalCasesAwaitingMock, type LegalReviewStatus } from "@/data/legal";

function getLegalStatusClasses(s: LegalReviewStatus) {
  switch (s) {
    case "Aguardando Parecer Jurídico":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
    case "Em Revisão":
      return "bg-status-blue-bg border-status-blue-border text-status-blue-text";
    case "Finalizado":
      return "bg-status-green-bg border-status-green-border text-status-green-text";
  }
}

export default function ProcessosAguardandoAnalise() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");

  const itens = useMemo(() => {
    const somenteAguardando = legalCasesAwaitingMock.filter(
      (c) => c.status === "Aguardando Parecer Jurídico",
    );
    if (!busca.trim()) return somenteAguardando;
    const q = busca.toLowerCase();
    return somenteAguardando.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        c.deviationType.toLowerCase().includes(q) ||
        c.classification.toLowerCase().includes(q),
    );
  }, [busca]);

  const aoSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={aoSair} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={() => navegar("/gestor/registrar")} userType="juridico" />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                  Processos Aguardando Análise Jurídica
                </h1>
                <p className="font-roboto text-sis-secondary-text">
                  Lista de processos encaminhados para sindicância e parecer jurídico.
                </p>
              </div>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Buscar por ID, funcionário, desvio..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Aguardando Parecer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-sis-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[14%]">ID do Processo</TableHead>
                        <TableHead className="w-[20%]">Funcionário</TableHead>
                        <TableHead className="w-[18%]">Tipo de Desvio</TableHead>
                        <TableHead className="w-[14%]">Classificação</TableHead>
                        <TableHead className="w-[16%]">Data de Encaminhamento</TableHead>
                        <TableHead className="w-[10%]">Status</TableHead>
                        <TableHead className="w-[8%]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            <button
                              className="underline text-blue-600 hover:text-blue-800"
                              onClick={() => navegar(`/juridico/processos/${c.id}`)}
                            >
                              {c.id}
                            </button>
                          </TableCell>
                          <TableCell className="truncate">{c.employeeName}</TableCell>
                          <TableCell className="truncate">{c.deviationType}</TableCell>
                          <TableCell>{c.classification}</TableCell>
                          <TableCell className="text-sis-secondary-text">{c.referralDate}</TableCell>
                          <TableCell>
                            <Badge className={`border ${getLegalStatusClasses(c.status)}`}>{c.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => navegar(`/juridico/processos/${c.id}`)}>
                              Analisar Processo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
