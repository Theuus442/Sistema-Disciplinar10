import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import SidebarJuridico from "@/components/SidebarJuridico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const statusOpcoes: ("todos" | StatusAtual)[] = [
  "todos",
  "Em Análise",
  "Sindicância",
  "Finalizado",
];

export default function TodosProcessos() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<(typeof statusOpcoes)[number]>("todos");

  const [processos, setProcessos] = useState<{ id: string; funcionario: string; tipoDesvio: string; classificacao: Classificacao; dataAbertura: string; status: StatusAtual; }[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchProcesses().then((data) => {
      if (mounted) setProcessos((data as any) || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const itens = useMemo(() => {
    const base = processos;
    const filtradoStatus = statusFiltro === "todos" ? base : base.filter((c) => c.status === statusFiltro);
    if (!busca.trim()) return filtradoStatus;
    const q = busca.toLowerCase();
    return filtradoStatus.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.funcionario.toLowerCase().includes(q) ||
        c.tipoDesvio.toLowerCase().includes(q) ||
        (c.classificacao as string).toLowerCase().includes(q),
    );
  }, [busca, statusFiltro, processos]);

  const aoSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={aoSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                  Todos os Processos (Jurídico)
                </h1>
                <p className="font-roboto text-sis-secondary-text">
                  Visualize e acesse qualquer processo para análise e decisão.
                </p>
              </div>
              <div className="flex w-full max-w-xl gap-3">
                <Input
                  placeholder="Buscar por ID, funcionário, desvio..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOpcoes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "todos" ? "Todos os Status" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Lista de Processos</CardTitle>
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
                            {c.status === "Finalizado" ? (
                              <Button size="sm" variant="outline" onClick={() => navegar(`/juridico/processos/${c.id}`)}>
                                Ver Detalhes
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => navegar(`/juridico/processos/${c.id}`)}>
                                Analisar Processo
                              </Button>
                            )}
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
