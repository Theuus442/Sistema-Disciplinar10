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
import { fetchProcesses } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FileText, Clock, CheckCircle2, PieChart as PieChartIcon, BarChart3, Calendar, Search, Download } from "lucide-react";

type Classificacao = "Leve" | "Média" | "Grave" | "Gravíssima";
type StatusAtual = "Em Análise" | "Sindicância" | "Aguardando Assinatura" | "Finalizado";
function getStatusClasses(s: StatusAtual) {
  switch (s) {
    case "Aguardando Parecer Jurídico":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
    case "Em Revisão":
      return "bg-status-blue-bg border-status-blue-border text-status-blue-text";
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

export default function Relatorios() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<(typeof statusOpcoes)[number]>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [processos, setProcessos] = useState<{ id: string; funcionario: string; tipoDesvio: string; classificacao: Classificacao; dataAbertura: string; status: StatusAtual; }[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchProcesses().then((data) => {
      if (mounted) setProcessos((data as any) || []);
    });
    return () => { mounted = false; };
  }, []);

  const dados = useMemo(() => {
    const base = processos;
    const porStatus = statusFiltro === "todos" ? base : base.filter((c) => c.status === statusFiltro);
    const porBusca = !busca.trim()
      ? porStatus
      : porStatus.filter(
          (c) =>
            c.id.toLowerCase().includes(busca.toLowerCase()) ||
            c.funcionario.toLowerCase().includes(busca.toLowerCase()) ||
            c.tipoDesvio.toLowerCase().includes(busca.toLowerCase()) ||
            (c.classificacao as string).toLowerCase().includes(busca.toLowerCase()),
        );
    const porPeriodo = porBusca.filter((c) => {
      const d = new Date(c.dataAbertura);
      const okInicio = dataInicio ? d >= new Date(dataInicio) : true;
      const okFim = dataFim ? d <= new Date(dataFim) : true;
      return okInicio && okFim;
    });
    return porPeriodo;
  }, [busca, statusFiltro, dataInicio, dataFim, processos]);

  const metricas = useMemo(() => {
    const total = dados.length;
    const aguardando = dados.filter((d) => d.status === "Aguardando Parecer Jurídico").length;
    const revisao = dados.filter((d) => d.status === "Em Revisão").length;
    const finalizado = dados.filter((d) => d.status === "Finalizado").length;
    return { total, aguardando, revisao, finalizado };
  }, [dados]);

  const distribuicaoStatus = useMemo(
    () => [
      { name: "Aguardando", value: metricas.aguardando },
      { name: "Em Revisão", value: metricas.revisao },
      { name: "Finalizado", value: metricas.finalizado },
    ],
    [metricas],
  );

  const distribuicaoClassificacao = useMemo(() => {
    const mapa = new Map<string, number>();
    dados.forEach((d) => {
      mapa.set(d.classification, (mapa.get(d.classification) || 0) + 1);
    });
    return Array.from(mapa.entries()).map(([name, value]) => ({ name, value }));
  }, [dados]);

  const CORES_STATUS = ["#F59E0B", "#3B82F6", "#22C55E"]; // amarelo, azul, verde
  const CORES_CLASS = ["#86EFAC", "#FDE68A", "#FCA5A5", "#F87171"]; // leve, média, grave, gravíssima

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
            <div className="space-y-3">
              <div>
                <h1 className="mb-1 font-open-sans text-3xl font-bold text-sis-dark-text">Relatórios (Jurídico)</h1>
                <p className="font-roboto text-sm text-sis-secondary-text">Gere visões e exporte dados para auditoria e acompanhamento.</p>
              </div>
              <Card className="border-sis-border bg-white">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Busca */}
                    <div className="col-span-12 md:col-span-5">
                      <label className="mb-1 block text-xs text-sis-secondary-text">Buscar</label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sis-secondary-text" />
                        <Input
                          className="pl-9"
                          placeholder="Buscar por ID, funcionário, desvio..."
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="mb-1 block text-xs text-sis-secondary-text">Status</label>
                      <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
                        <SelectContent>
                          {statusOpcoes.map((s) => (
                            <SelectItem key={s} value={s}>{s === "todos" ? "Todos os Status" : s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Período */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="mb-1 block text-xs text-sis-secondary-text">Período</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sis-secondary-text" />
                          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="pl-9" />
                        </div>
                        <span className="text-sm text-sis-secondary-text">—</span>
                        <div className="relative flex-1">
                          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sis-secondary-text" />
                          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="pl-9" />
                        </div>
                      </div>
                    </div>

                    {/* Exportar */}
                    <div className="col-span-12 md:col-span-2 flex items-end justify-end">
                      <Button onClick={exportarCSV} className="w-full bg-sis-blue text-white hover:bg-blue-700 md:w-auto">
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
                  <FileText className="h-4 w-4 text-sis-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metricas.total}</div>
                  <p className="text-xs text-sis-secondary-text">Período selecionado</p>
                </CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aguardando Parecer</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metricas.aguardando}</div>
                  <p className="text-xs text-sis-secondary-text">Casos pendentes de análise</p>
                </CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Revisão</CardTitle>
                  <PieChartIcon className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metricas.revisao}</div>
                  <p className="text-xs text-sis-secondary-text">Sindicâncias em andamento</p>
                </CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metricas.finalizado}</div>
                  <p className="text-xs text-sis-secondary-text">Com decisão registrada</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Distribuição por Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-sis-secondary-text" />
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribuicaoStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {distribuicaoStatus.map((_, idx) => (
                          <Cell key={idx} fill={CORES_STATUS[idx % CORES_STATUS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-sis-border bg-white">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Processos por Classificação</CardTitle>
                  <PieChartIcon className="h-4 w-4 text-sis-secondary-text" />
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribuicaoClassificacao}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {distribuicaoClassificacao.map((_, idx) => (
                          <Cell key={idx} fill={CORES_CLASS[idx % CORES_CLASS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle>Detalhamento ({dados.length})</CardTitle>
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
                      {dados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-sis-secondary-text">
                            Nenhum processo encontrado para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dados.map((c) => (
                          <TableRow key={c.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{c.id}</TableCell>
                            <TableCell className="truncate">{c.employeeName}</TableCell>
                            <TableCell className="truncate">{c.deviationType}</TableCell>
                            <TableCell>{c.classification}</TableCell>
                            <TableCell className="text-sis-secondary-text">{c.referralDate}</TableCell>
                            <TableCell>
                              <Badge className={`border ${getLegalStatusClasses(c.status)}`}>{c.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => navegar(`/juridico/processos/${c.id}`)}>Abrir</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
