import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import TabelaProcessos from "@/components/TabelaProcessos";
import { fetchProcesses } from "@/lib/api";

type DashboardProc = {
  id: string;
  colaborador: string;
  tipoDesvio: string;
  status: { texto: string; cor: "amarelo" | "azul" | "roxo" | "verde" };
  dataInicio: string;
  prazo: string;
};

export default function GestorDashboard() {
  const navigate = useNavigate();
  const handleRegistrarDesvio = () => {
    navigate("/gestor/registrar");
  };

  const handleSair = () => {
    window.location.href = "/";
  };

  const [processos, setProcessos] = useState<DashboardProc[]>([]);
  const [metricas, setMetricas] = useState<Array<{ titulo: string; valor: string; descricao: string; icon: JSX.Element }>>([
    { titulo: "Processos Ativos", valor: "0", descricao: "", icon: (
        <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.0199 14.01L10.0199 12.67C10.0199 12.137 9.80797 11.6258 9.43103 11.2489C9.10126 10.9191 8.66884 10.7156 8.20882 10.6698L8.00989 10.66L3.98989 10.66C3.45681 10.66 2.94571 10.8719 2.56876 11.2489C2.19181 11.6258 1.97989 12.137 1.97989 12.67L1.97989 14.01C1.97989 14.38 1.67992 14.68 1.30989 14.68C0.939865 14.68 0.639893 14.38 0.639893 14.01L0.639893 12.67C0.639893 11.7815 0.99309 10.9297 1.62134 10.3014C2.24959 9.67323 3.10142 9.32001 3.98989 9.32001L8.00989 9.32001L8.17605 9.32396C9.00404 9.36503 9.78948 9.71249 10.3785 10.3014C11.0067 10.9297 11.3599 11.7815 11.3599 12.67L11.3599 14.01C11.3599 14.38 11.0599 14.68 10.6899 14.68C10.3199 14.68 10.0199 14.38 10.0199 14.01Z" fill="currentColor" />
          <path d="M12.0023 4.67006C12.0023 4.22485 11.8546 3.79211 11.5822 3.43999C11.3438 3.13179 11.0214 2.90044 10.6557 2.7726L10.4967 2.72419L10.4313 2.7039C10.1129 2.58591 9.92945 2.24344 10.0165 1.90763C10.1036 1.5719 10.4301 1.36214 10.7657 1.41363L10.8331 1.42737L10.9665 1.46466C11.6301 1.66632 12.2157 2.06985 12.6415 2.62015C13.0957 3.20706 13.3423 3.92797 13.3423 4.67006C13.3423 5.41216 13.0957 6.13307 12.6415 6.72001C12.1873 7.30686 11.5515 7.72655 10.8331 7.91274C10.4749 8.0056 10.1094 7.7906 10.0165 7.43249C9.92362 7.07437 10.1386 6.70882 10.4967 6.61594C10.9277 6.5042 11.3097 6.25229 11.5822 5.90014C11.8547 5.54802 12.0023 5.11528 12.0023 4.67006Z" fill="currentColor" />
          <path d="M14.005 14.0099L14.005 12.6705L13.9978 12.5044C13.9655 12.1183 13.8224 11.7485 13.5836 11.4405C13.3448 11.1324 13.0224 10.9013 12.6565 10.7738L12.4975 10.7253L12.432 10.705C12.1135 10.5874 11.9299 10.2453 12.0166 9.90941C12.1033 9.57367 12.4295 9.36302 12.7651 9.41414L12.8325 9.42848L12.966 9.4658C13.6299 9.66687 14.2166 10.0693 14.6429 10.6193C15.0976 11.2059 15.3444 11.927 15.345 12.6693L15.345 14.0099C15.3449 14.3799 15.045 14.6799 14.675 14.6799C14.305 14.6799 14.0051 14.3799 14.005 14.0099Z" fill="currentColor" />
          <path d="M8.0099 4.67001C8.0099 3.55992 7.11002 2.66001 5.9999 2.66001C4.88981 2.66001 3.9899 3.55992 3.9899 4.67001C3.9899 5.7801 4.88981 6.68001 5.9999 6.68001C7.11002 6.68001 8.0099 5.7801 8.0099 4.67001ZM9.3499 4.67001C9.3499 6.52016 7.85004 8.02001 5.9999 8.02001C4.14975 8.02001 2.6499 6.52016 2.6499 4.67001C2.6499 2.81986 4.14975 1.32001 5.9999 1.32001C7.85004 1.32001 9.3499 2.81986 9.3499 4.67001Z" fill="currentColor" />
        </svg>
      ) },
    { titulo: "Processos Concluídos", valor: "0", descricao: "", icon: (
        <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.0299 8.00001C14.0299 4.66973 11.3302 1.97 7.99988 1.97C4.66961 1.97 1.96988 4.66973 1.96988 8.00001C1.96988 11.3303 4.66961 14.03 7.99988 14.03C11.3302 14.03 14.0299 11.3303 14.0299 8.00001ZM15.3699 8.00001C15.3699 12.0703 12.0702 15.37 7.99988 15.37C3.92955 15.37 0.629883 12.0703 0.629883 8.00001C0.629883 3.92967 3.92955 0.630005 7.99988 0.630005C12.0702 0.630005 15.3699 3.92967 15.3699 8.00001Z" fill="currentColor" />
          <path d="M9.58727 6.14051C9.85038 5.92587 10.2383 5.94101 10.4836 6.18631C10.7289 6.4316 10.7441 6.81954 10.5294 7.08271L10.4836 7.1337L7.80359 9.8137C7.55831 10.0591 7.17038 10.0742 6.90727 9.85953L6.85622 9.8137L5.5162 8.4737L5.4704 8.42271C5.25577 8.15954 5.2709 7.77161 5.5162 7.52632C5.7615 7.28103 6.14943 7.26589 6.41259 7.48049L6.46362 7.52632L7.3299 8.39256L9.53621 6.18631L9.58727 6.14051Z" fill="currentColor" />
        </svg>
      ) },
    { titulo: "Pendentes da Equipe", valor: "0", descricao: "", icon: (
        <svg className="h-4 w-4" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.1701 7.50001C13.1701 4.36855 10.6315 1.83001 7.50007 1.83001C4.36862 1.83001 1.83007 4.36855 1.83007 7.50001C1.83007 10.6315 4.36862 13.17 7.50007 13.17C10.6315 13.17 13.1701 10.6315 13.1701 7.50001ZM14.4301 7.50001C14.4301 11.3273 11.3274 14.43 7.50007 14.43C3.67274 14.43 0.570068 11.3273 0.570068 7.50001C0.570068 3.67268 3.67274 0.570007 7.50007 0.570007C11.3274 0.570007 14.4301 3.67268 14.4301 7.50001Z" fill="currentColor" />
          <path d="M6.86011 3.73001C6.86011 3.38207 7.14216 3.10001 7.49011 3.10001C7.83806 3.10001 8.12011 3.38207 8.12011 3.73001V7.12054L10.2919 8.20647L10.3479 8.23841C10.6176 8.40939 10.7196 8.76005 10.5736 9.05181C10.4278 9.34356 10.086 9.47265 9.7874 9.35937L9.72831 9.33354L7.20831 8.07354C6.99493 7.96682 6.86011 7.74865 6.86011 7.51001L6.86011 3.73001Z" fill="currentColor" />
        </svg>
      ) },
    { titulo: "Média de Resolução (dias)", valor: "0", descricao: "", icon: (
        <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.67 4.64499C12.9492 4.64499 13.1994 4.81806 13.2975 5.07944L15.3075 10.4394C15.4121 10.7184 15.3197 11.0331 15.0811 11.2115C14.3831 11.733 13.539 12.015 12.67 12.015C11.801 12.015 10.957 11.733 10.259 11.2115C10.0203 11.0331 9.92791 10.7184 10.0326 10.4394L12.0426 5.07944L12.0864 4.98588C12.2038 4.77759 12.4257 4.64499 12.67 4.64499ZM11.4805 10.3943C11.8498 10.5774 12.2557 10.675 12.67 10.675C13.0841 10.675 13.4897 10.5772 13.8589 10.3943L12.67 7.22355L11.4805 10.3943Z" fill="currentColor" />
          <path d="M3.33004 4.64499C3.60926 4.64499 3.85939 4.81806 3.95751 5.07944L5.96751 10.4394C6.07213 10.7184 5.97975 11.0331 5.74113 11.2115C5.04313 11.733 4.19906 12.015 3.33004 12.015C2.46103 12.015 1.61696 11.733 0.918957 11.2115C0.680337 11.0331 0.587958 10.7184 0.692571 10.4394L2.70257 5.07944L2.74641 4.98588C2.86379 4.77759 3.0857 4.64499 3.33004 4.64499ZM2.14053 10.3943C2.50983 10.5774 2.91569 10.675 3.33004 10.675C3.7442 10.675 4.14974 10.5772 4.5189 10.3943L3.33004 7.22355L2.14053 10.3943Z" fill="currentColor" />
          <path d="M11.3501 13.33C11.7201 13.33 12.0201 13.6299 12.0201 14C12.0201 14.37 11.7201 14.67 11.3501 14.67L4.6501 14.67C4.28007 14.67 3.9801 14.37 3.9801 14C3.9801 13.6299 4.28007 13.33 4.6501 13.33L11.3501 13.33Z" fill="currentColor" />
          <path d="M7.33008 14.03L7.33008 1.96999C7.33008 1.59996 7.63004 1.29999 8.00008 1.29999C8.37012 1.29999 8.67008 1.59996 8.67008 1.96999L8.67008 14.03C8.67008 14.4 8.37012 14.7 8.00008 14.7C7.63004 14.7 7.33008 14.4 7.33008 14.03Z" fill="currentColor" />
          <path d="M7.77238 2.69989C7.94384 2.6379 8.13458 2.64808 8.29974 2.73064L8.55032 2.85234C9.83632 3.45673 11.5761 3.99998 12.69 3.99998L14.03 3.99998C14.4001 3.99998 14.7 4.29995 14.7 4.66998C14.7 5.04001 14.4001 5.33998 14.03 5.33998L12.69 5.33998C11.3025 5.33998 9.37194 4.71491 8.00005 4.07326C6.62819 4.71491 4.69759 5.33998 3.31005 5.33998H1.97005C1.60002 5.33998 1.30005 5.04001 1.30005 4.66998C1.30005 4.29995 1.60002 3.99998 1.97005 3.99998L3.31005 3.99998C4.49824 3.99998 6.39831 3.38168 7.70036 2.73064L7.77238 2.69989Z" fill="currentColor" />
        </svg>
      ) },
  ]);

  useEffect(() => {
    let mounted = true;
    fetchProcesses()
      .then((list: any[]) => {
        if (!mounted) return;
        const itens: DashboardProc[] = (list || []).map((p) => ({
          id: p.id,
          colaborador: p.funcionario,
          tipoDesvio: p.tipoDesvio,
          status: {
            texto: p.status,
            cor:
              p.status === "Em Análise" ? "amarelo" :
              p.status === "Sindicância" ? "azul" :
              p.status === "Aguardando Assinatura" ? "roxo" :
              "verde",
          },
          dataInicio: p.dataAbertura,
          prazo: "",
        }));
        setProcessos(itens);

        const total = list?.length || 0;
        const concluidos = (list || []).filter((p) => p.status === "Finalizado").length;
        const ativos = total - concluidos;
        const pendentes = (list || []).filter((p) => p.status === "Em Análise" || p.status === "Sindicância").length;

        const now = Date.now();
        const daysArr: number[] = (list || [])
          .map((p) => (p.createdAt ? Math.max(0, Math.round((now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : null))
          .filter((v): v is number => v !== null);
        const mediaDias = daysArr.length ? (daysArr.reduce((a, b) => a + b, 0) / daysArr.length).toFixed(1) : "0";

        setMetricas((m) => [
          { ...m[0], valor: String(ativos) },
          { ...m[1], valor: String(concluidos) },
          { ...m[2], valor: String(pendentes) },
          { ...m[3], valor: mediaDias },
        ]);
      })
      .catch(() => {
        if (!mounted) return;
        setProcessos([]);
        setMetricas((m) => m.map((x) => ({ ...x, valor: "0" })));
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar onSair={handleSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Dashboard do Gestor</h1>
              <h2 className="font-open-sans text-2xl font-semibold text-sis-dark-text">Visão Geral do Desempenho da Equipe</h2>
            </div>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {metricas.map((metrica, index) => (
                <MetricCard key={index} titulo={metrica.titulo} valor={metrica.valor} descricao={metrica.descricao} icon={metrica.icon} />
              ))}
            </div>
            <TabelaProcessos processos={processos} />
          </div>
        </div>
      </div>
    </div>
  );
}
