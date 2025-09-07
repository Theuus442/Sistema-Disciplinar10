import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SidebarJuridico from "@/components/SidebarJuridico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const statusOpcoes: ("todos" | LegalReviewStatus)[] = [
  "todos",
  "Aguardando Parecer Jurídico",
  "Em Revisão",
  "Finalizado",
];

export default function Relatorios() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<(typeof statusOpcoes)[number]>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const dados = useMemo(() => {
    const base = legalCasesAwaitingMock;
    const porStatus = statusFiltro === "todos" ? base : base.filter((c) => c.status === statusFiltro);
    const porBusca = !busca.trim()
      ? porStatus
      : porStatus.filter(
          (c) =>
            c.id.toLowerCase().includes(busca.toLowerCase()) ||
            c.employeeName.toLowerCase().includes(busca.toLowerCase()) ||
            c.deviationType.toLowerCase().includes(busca.toLowerCase()) ||
            c.classification.toLowerCase().includes(busca.toLowerCase()),
        );
    const porPeriodo = porBusca.filter((c) => {
      const d = new Date(c.referralDate);
      const okInicio = dataInicio ? d >= new Date(dataInicio) : true;
      const okFim = dataFim ? d <= new Date(dataFim) : true;
      return okInicio && okFim;
    });
    return porPeriodo;
  }, [busca, statusFiltro, dataInicio, dataFim]);

  const metricas = useMemo(() => {
    const total = dados.length;
    const aguardando = dados.filter((d) => d.status === "Aguardando Parecer Jurídico").length;
    const revisao = dados.filter((d) => d.status === "Em Revisão").length;
    const finalizado = dados.filter((d) => d.status === "Finalizado").length;
    return { total, aguardando, revisao, finalizado };
  }, [dados]);

  const exportarCSV = () => {
    const cabecalho = [
      "ID",
      "Funcionario",
      "Tipo de Desvio",
      "Classificacao",
      "Data de Encaminhamento",
      "Status",
      "Decisao",
      "Medida",
      "Data Decisao",
    ];
    const linhas = dados.map((d) => [
      d.id,
      d.employeeName,
      d.deviationType,
      d.classification,
      d.referralDate,
      d.status,
      d.legalDecisionResult ?? "",
      d.legalDecisionMeasure ?? "",
      d.decisionDate ?? "",
    ]);
    const csv = [cabecalho, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/\"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorios-processos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Relatórios (Jurídico)</h1>
                <p className="font-roboto text-sis-secondary-text">Gere visões e exporte dados para auditoria e acompanhamento.</p>
              </div>
              <div className="flex w-full max-w-2xl flex-wrap items-end gap-3">
                <Input className="min-w-[220px]" placeholder="Buscar por ID, funcionário, desvio..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {statusOpcoes.map((s) => (
                      <SelectItem key={s} value={s}>{s === "todos" ? "Todos os Status" : s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                <Button onClick={exportarCSV} className="bg-sis-blue text-white hover:bg-blue-700">Exportar CSV</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card className="border-sis-border bg-white">
                <CardHeader><CardTitle>Total de Processos</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{metricas.total}</p></CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader><CardTitle>Aguardando Parecer</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{metricas.aguardando}</p></CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader><CardTitle>Finalizados</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{metricas.finalizado}</p></CardContent>
              </Card>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Detalhamento</CardTitle></CardHeader>
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
                      {dados.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.id}</TableCell>
                          <TableCell className="truncate">{c.employeeName}</TableCell>
                          <TableCell className="truncate">{c.deviationType}</TableCell>
                          <TableCell>{c.classification}</TableCell>
                          <TableCell className="text-sis-secondary-text">{c.referralDate}</TableCell>
                          <TableCell><Badge className={`border ${getLegalStatusClasses(c.status)}`}>{c.status}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => navegar(`/juridico/processos/${c.id}`)}>Abrir</Button>
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
