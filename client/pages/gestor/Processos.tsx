import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  processosMock,
  type ProcessoItem,
  type Classificacao,
  type StatusAtual,
} from "@/data/processos";

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

export default function ProcessosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroClassificacao, setFiltroClassificacao] =
    useState<Classificacao | "todas">("todas");
  const [filtroStatus, setFiltroStatus] = useState<StatusAtual | "todos">(
    "todos",
  );

  const tiposDisponiveis = useMemo(() => {
    const set = new Set(processosMock.map((p) => p.tipoDesvio));
    return ["todos", ...Array.from(set)];
  }, []);

  const classificacoes: (Classificacao | "todas")[] = [
    "todas",
    "Leve",
    "Média",
    "Grave",
    "Gravíssima",
  ];

  const statusLista: (StatusAtual | "todos")[] = [
    "todos",
    "Em Análise",
    "Sindicância",
    "Aguardando Assinatura",
    "Finalizado",
  ];

  const filtrados = useMemo<ProcessoItem[]>(() => {
    return processosMock.filter((p) => {
      const buscaOk =
        busca.trim().length === 0 ||
        p.funcionario.toLowerCase().includes(busca.toLowerCase()) ||
        p.id.toLowerCase().includes(busca.toLowerCase());

      const tipoOk = filtroTipo === "todos" || p.tipoDesvio === filtroTipo;
      const classOk =
        filtroClassificacao === "todas" || p.classificacao === filtroClassificacao;
      const statusOk = filtroStatus === "todos" || p.status === filtroStatus;

      return buscaOk && tipoOk && classOk && statusOk;
    });
  }, [busca, filtroTipo, filtroClassificacao, filtroStatus]);

  const handleRegistrarDesvio = () => {
    navigate("/gestor/registrar");
  };

  const handleSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar onSair={handleSair} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={handleRegistrarDesvio} />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                Processos
              </h1>
              <p className="font-roboto text-sm text-sis-secondary-text">
                Lista de todos os casos disciplinares com busca e filtros.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por funcionário ou ID do processo"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Desvio" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponiveis.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "todos" ? "Todos os Tipos" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroClassificacao}
                onValueChange={(v) => setFiltroClassificacao(v as Classificacao | "todas")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classificação" />
                </SelectTrigger>
                <SelectContent>
                  {classificacoes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "todas" ? "Todas as Classificações" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroStatus}
                onValueChange={(v) => setFiltroStatus(v as StatusAtual | "todos")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusLista.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "todos" ? "Todos os Status" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-sis-border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[26%]">Funcionário</TableHead>
                    <TableHead className="w-[24%]">Tipo de Desvio</TableHead>
                    <TableHead className="w-[14%]">Classificação</TableHead>
                    <TableHead className="w-[14%]">Data de Abertura</TableHead>
                    <TableHead className="w-[12%]">Status Atual</TableHead>
                    <TableHead className="w-[10%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium truncate">{p.funcionario}</TableCell>
                      <TableCell className="truncate">{p.tipoDesvio}</TableCell>
                      <TableCell>
                        <Badge className={`border ${getClassificacaoClasses(p.classificacao)}`}>
                          {p.classificacao}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.dataAbertura}</TableCell>
                      <TableCell>{p.status}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/gestor/processos/${p.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nenhum processo encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
