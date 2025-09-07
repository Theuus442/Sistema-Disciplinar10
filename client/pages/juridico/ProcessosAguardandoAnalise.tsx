import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import SidebarJuridico from "@/components/SidebarJuridico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProcesses } from "@/lib/api";

type Classificacao = "Leve" | "Média" | "Grave" | "Gravíssima";
type StatusAtual = "Em Análise" | "Sindicância" | "Aguardando Assinatura" | "Finalizado";
function getStatusClasses(s: StatusAtual) {
  switch (s) {
    case "Em Análise":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
    case "Sindicância":
      return "bg-status-blue-bg border-status-blue-border text-status-blue-text";
    case "Aguardando Assinatura":
      return "bg-status-purple-bg border-status-purple-border text-status-purple-text";
    case "Finalizado":
      return "bg-status-green-bg border-status-green-border text-status-green-text";
  }
}

export default function ProcessosAguardandoAnalise() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [processos, setProcessos] = useState<{ id: string; funcionario: string; tipoDesvio: string; classificacao: Classificacao; dataAbertura: string; status: StatusAtual; }[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchProcesses().then((data) => {
      if (mounted) setProcessos((data as any) || []);
    });
    return () => { mounted = false; };
  }, []);

  const itens = useMemo(() => {
    const aguardando = processos.filter((c) => c.status === "Sindicância");
    if (!busca.trim()) return aguardando;
    const q = busca.toLowerCase();
    return aguardando.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.funcionario.toLowerCase().includes(q) ||
        c.tipoDesvio.toLowerCase().includes(q) ||
        (c.classificacao as string).toLowerCase().includes(q),
    );
  }, [busca, processos]);

  const aoSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={aoSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
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
                          <TableCell className="truncate">{c.funcionario}</TableCell>
                          <TableCell className="truncate">{c.tipoDesvio}</TableCell>
                          <TableCell>{c.classificacao}</TableCell>
                          <TableCell className="text-sis-secondary-text">{c.dataAbertura}</TableCell>
                          <TableCell>
                            <Badge className={`border ${getStatusClasses(c.status)}`}>{c.status}</Badge>
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
