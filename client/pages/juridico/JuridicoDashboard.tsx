import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SidebarJuridico from "@/components/SidebarJuridico";
import MetricCard from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchProcesses } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type StatusJuridico = "Em Revisão" | "Pendente" | "Finalizado" | "Aguardando Análise";

const getStatusJuridicoClasses = (s: StatusJuridico) => {
  switch (s) {
    case "Em Revisão":
      return "bg-status-blue-bg border-status-blue-border text-status-blue-text";
    case "Pendente":
      return "bg-orange-100 border-orange-200 text-orange-800";
    case "Finalizado":
      return "bg-status-green-bg border-status-green-border text-status-green-text";
    case "Aguardando Análise":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
  }
};

type StatusAtual = "Em Análise" | "Sindicância" | "Aguardando Assinatura" | "Finalizado";
function getStatusClasses(s: StatusAtual) {
  switch (s) {
    case "Em Análise":
      return "bg-status-yellow-bg border-status-yellow-border text-status-yellow-text";
    case "Sindicância":
      return "bg-status-blue-bg border-status-blue-border text-status-blue-text";
    case "Finalizado":
      return "bg-status-green-bg border-status-green-border text-status-green-text";
  }
}

function AwaitingLegalTable() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<{ id: string; funcionario: string; tipoDesvio: string; classificacao: string; dataAbertura: string; status: StatusAtual; }[]>([]);
  useEffect(() => {
    let mounted = true;
    fetchProcesses().then((data) => {
      if (mounted) setProcessos((data as any) || []);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="rounded-md border border-sis-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[14%]">ID do Processo</TableHead>
            <TableHead className="w-[20%]">Funcionário</TableHead>
            <TableHead className="w-[18%]">Tipo de Desvio</TableHead>
            <TableHead className="w-[14%]">Classificação</TableHead>
            <TableHead className="w-[16%]">Data de Abertura</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[8%]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processos
            .filter((c) => c.status === "Sindicância")
            .map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.id}</TableCell>
                <TableCell className="truncate">{c.funcionario}</TableCell>
                <TableCell className="truncate">{c.tipoDesvio}</TableCell>
                <TableCell>{c.classificacao}</TableCell>
                <TableCell className="text-sis-secondary-text">{c.dataAbertura}</TableCell>
                <TableCell>
                  <Badge className={`border ${getStatusClasses(c.status)}`}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => navigate(`/juridico/processos/${c.id}`)}>
                    Analisar Processo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function JuridicoDashboard() {
  const navigate = useNavigate();

  const handleRegistrarDesvio = () => {
    navigate("/gestor/registrar");
  };

  const handleSair = () => {
    console.log("Sair do sistema");
    window.location.href = "/";
  };

  // Dados das métricas do jurídico
  const metricas = [
    {
      titulo: "Total de Processos",
      valor: "1.234",
      descricao: "Processos jurídicos ativos e concluídos.",
      icon: (
        <svg
          className="h-5 w-5"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15.8299 5.85504C16.1758 5.85504 16.4857 6.06944 16.6072 6.39325L19.0972 13.0332C19.2269 13.3788 19.1124 13.7687 18.8168 13.9897C17.9521 14.6357 16.9065 14.985 15.8299 14.985C14.7534 14.985 13.7078 14.6357 12.8431 13.9897C12.5475 13.7687 12.433 13.3788 12.5627 13.0332L15.0527 6.39325L15.1069 6.27734C15.2523 6.01931 15.5272 5.85504 15.8299 5.85504ZM14.3564 12.9774C14.8139 13.2042 15.3167 13.325 15.8299 13.325C16.343 13.325 16.8454 13.2039 17.3027 12.9774L15.8299 9.04938L14.3564 12.9774Z" fill="#3B82F6"/>
          <path d="M4.16996 5.85504C4.51586 5.85504 4.82573 6.06944 4.94728 6.39325L7.43728 13.0332C7.56688 13.3788 7.45244 13.7687 7.15683 13.9897C6.29215 14.6357 5.24651 14.985 4.16996 14.985C3.09343 14.985 2.04779 14.6357 1.1831 13.9897C0.887495 13.7687 0.773055 13.3788 0.902651 13.0332L3.39265 6.39325L3.44696 6.27734C3.59237 6.01931 3.86728 5.85504 4.16996 5.85504ZM2.69639 12.9774C3.15388 13.2042 3.65667 13.325 4.16996 13.325C4.68303 13.325 5.18541 13.2039 5.64273 12.9774L4.16996 9.04938L2.69639 12.9774Z" fill="#3B82F6"/>
          <path d="M14.15 16.67C14.6084 16.67 14.98 17.0416 14.98 17.5C14.98 17.9584 14.6084 18.33 14.15 18.33L5.84996 18.33C5.39157 18.33 5.01996 17.9584 5.01996 17.5C5.01996 17.0416 5.39157 16.67 5.84996 16.67L14.15 16.67Z" fill="#3B82F6"/>
          <path d="M9.16998 17.47L9.16998 2.53001C9.16998 2.07162 9.54157 1.70001 9.99998 1.70001C10.4584 1.70001 10.83 2.07162 10.83 2.53001L10.83 17.47C10.83 17.9284 10.4584 18.3 9.99998 18.3C9.54157 18.3 9.16998 17.9284 9.16998 17.47Z" fill="#3B82F6"/>
          <path d="M9.71792 3.38947C9.93032 3.31268 10.1666 3.3253 10.3712 3.42757L10.6816 3.57833C12.2747 4.32705 14.43 5.00003 15.81 5.00003H17.47C17.9284 5.00003 18.3 5.37164 18.3 5.83003C18.3 6.28843 17.9284 6.66003 17.47 6.66003H15.81C14.091 6.66003 11.6995 5.88569 9.99995 5.09082C8.30049 5.88569 5.90885 6.66003 4.18995 6.66003H2.52995C2.07156 6.66003 1.69995 6.28843 1.69995 5.83003C1.69995 5.37164 2.07156 5.00003 2.52995 5.00003L4.18995 5.00003C5.66189 5.00003 8.0157 4.23408 9.62869 3.42757L9.71792 3.38947Z" fill="#3B82F6"/>
        </svg>
      ),
    },
    {
      titulo: "Casos em Análise",
      valor: "156",
      descricao: "Atualmente aguardando revisão.",
      icon: (
        <svg
          className="h-5 w-5"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.4753 9.84087C11.7994 9.51675 12.3249 9.51684 12.649 9.84087C12.9731 10.165 12.9731 10.6904 12.649 11.0145L6.00896 17.6545C5.55354 18.1099 4.94619 18.3781 4.306 18.41L4.17712 18.4132C3.49009 18.4131 2.83109 18.1403 2.34528 17.6545C1.85949 17.1687 1.58661 16.5098 1.58661 15.8227C1.58661 15.1356 1.85949 14.4767 2.34528 13.9909L8.98526 7.35084C9.30938 7.02674 9.83485 7.0268 10.159 7.35084C10.4831 7.67497 10.4831 8.20037 10.159 8.52449L3.51896 15.1645C3.34447 15.339 3.24661 15.5759 3.24661 15.8227C3.24661 16.0694 3.34447 16.3063 3.51896 16.4809C3.69345 16.6553 3.93035 16.7531 4.17712 16.7532L4.26952 16.7491C4.48246 16.728 4.68262 16.6334 4.83528 16.4809L11.4753 9.84087Z" fill="#F97316"/>
          <path d="M17.7332 7.75311C18.0573 7.42898 18.5827 7.42898 18.9068 7.75311C19.231 8.07724 19.231 8.60264 18.9068 8.92675L13.9268 13.9068C13.6027 14.231 13.0773 14.231 12.7532 13.9068C12.429 13.5826 12.429 13.0572 12.7532 12.7331L17.7332 7.75311Z" fill="#F97316"/>
          <path d="M11.0732 1.09314C11.3974 0.769003 11.9227 0.769003 12.2469 1.09314C12.571 1.41727 12.571 1.94268 12.2469 2.26681L7.26687 7.24681C6.94273 7.57095 6.41734 7.57095 6.0932 7.24681C5.76906 6.92268 5.76906 6.39727 6.0932 6.07314L11.0732 1.09314Z" fill="#F97316"/>
          <path d="M6.92321 5.26311C7.22708 4.95923 7.70766 4.94048 8.03366 5.20637L8.09688 5.26311L14.7368 11.9031L14.7936 11.9663C15.0595 12.2923 15.0408 12.7729 14.7368 13.0768C14.433 13.3806 13.9524 13.3994 13.6265 13.1335L13.5632 13.0768L6.92321 6.43678L6.86647 6.37356C6.60058 6.04756 6.61933 5.56699 6.92321 5.26311Z" fill="#F97316"/>
          <path d="M10.2632 1.92315C10.5671 1.61927 11.0477 1.60052 11.3737 1.86641L11.4369 1.92315L18.0769 8.56317L18.1336 8.62633C18.3996 8.95236 18.3808 9.43293 18.0769 9.73679C17.773 10.0407 17.2924 10.0594 16.9665 9.79356L16.9032 9.73679L10.2632 3.09682L10.2065 3.0336C9.94061 2.7076 9.95937 2.22703 10.2632 1.92315Z" fill="#F97316"/>
        </svg>
      ),
    },
    {
      titulo: "Acordos Concluídos",
      valor: "89",
      descricao: "Casos finalizados com sucesso este mês.",
      icon: (
        <svg
          className="h-5 w-5"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8.58104 0.978204C10.5152 0.673499 12.4923 0.999435 14.2225 1.90142L14.5645 2.08947L14.6359 2.13486C14.9773 2.38069 15.0839 2.85029 14.8693 3.22262C14.6545 3.5949 14.1945 3.73795 13.8107 3.56547L13.7353 3.52657L13.4549 3.37338C12.0395 2.63549 10.422 2.36871 8.83966 2.61794C7.15187 2.88385 5.60596 3.72047 4.46024 4.98798C3.31455 6.25555 2.63785 7.87779 2.5433 9.58374C2.44878 11.2898 2.94201 12.9772 3.94069 14.3635C4.93935 15.7499 6.38346 16.7522 8.03152 17.2029C9.67954 17.6536 11.4326 17.5258 12.9977 16.8406C14.563 16.1554 15.8462 14.9538 16.633 13.4371C17.3707 12.0152 17.6303 10.3965 17.3787 8.82023L17.3212 8.50574L17.3091 8.42149C17.2672 8.00304 17.5479 7.61252 17.9688 7.52661C18.3901 7.44079 18.8018 7.69056 18.9269 8.09237L18.948 8.17425L19.0177 8.55844C19.3251 10.4852 19.0075 12.4635 18.1058 14.2014C17.1441 16.0552 15.5763 17.5238 13.6632 18.3612C11.7503 19.1985 9.60808 19.3545 7.59382 18.8037C5.57948 18.2528 3.81416 17.0283 2.59356 15.3338C1.37298 13.6393 0.770232 11.5773 0.885733 9.49219C1.00127 7.40703 1.8287 5.42439 3.22903 3.8751C4.62935 2.32591 6.51824 1.30321 8.58104 0.978204Z" fill="#22C55E"/>
          <path d="M17.7914 2.70643C18.1174 2.44054 18.5979 2.45929 18.9018 2.76317C19.2058 3.06705 19.2245 3.54762 18.9586 3.87362L18.9018 3.93684L10.6018 12.2368C10.2979 12.5407 9.81738 12.5594 9.49144 12.2936L9.42819 12.2368L6.93818 9.74682L6.88144 9.68366C6.61555 9.35763 6.6343 8.87706 6.93818 8.5732C7.24205 8.26929 7.72263 8.25054 8.04863 8.51643L8.11185 8.5732L10.015 10.4763L17.7282 2.76317L17.7914 2.70643Z" fill="#22C55E"/>
        </svg>
      ),
    },
    {
      titulo: "Taxa de Conformidade",
      valor: "98.5%",
      descricao: "Média de conformidade da empresa.",
      icon: (
        <svg
          className="h-5 w-5"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.48 17.49V15.83C12.48 15.1696 12.2175 14.5364 11.7505 14.0695C11.342 13.661 10.8063 13.4088 10.2364 13.3521L9.98999 13.34H5.00999C4.3496 13.34 3.71645 13.6025 3.24948 14.0695C2.78251 14.5364 2.51999 15.1696 2.51999 15.83L2.51999 17.49C2.51999 17.9484 2.14838 18.32 1.68999 18.32C1.23159 18.32 0.859985 17.9484 0.859985 17.49L0.859985 15.83C0.859985 14.7293 1.29753 13.6741 2.0758 12.8958C2.85409 12.1176 3.90934 11.68 5.00999 11.68H9.98999L10.1958 11.6849C11.2215 11.7358 12.1945 12.1662 12.9242 12.8958C13.7024 13.6741 14.14 14.7293 14.14 15.83V17.49C14.14 17.9484 13.7684 18.32 13.31 18.32C12.8516 18.32 12.48 17.9484 12.48 17.49Z" fill="#A855F7"/>
          <path d="M14.9918 5.83006C14.9918 5.27853 14.8088 4.74245 14.4713 4.30624C14.1759 3.92444 13.7766 3.63784 13.3236 3.47948L13.1267 3.4195L13.0457 3.39437C12.6512 3.2482 12.4239 2.82394 12.5317 2.40794C12.6396 1.99204 13.0441 1.73219 13.4598 1.79597L13.5433 1.81299L13.7087 1.85919C14.5307 2.10901 15.2561 2.6089 15.7837 3.29062C16.3462 4.01768 16.6518 4.91075 16.6518 5.83006C16.6518 6.74938 16.3462 7.64244 15.7837 8.36954C15.221 9.09654 14.4332 9.61645 13.5433 9.84711C13.0996 9.96215 12.6468 9.6958 12.5317 9.25217C12.4167 8.80853 12.683 8.35568 13.1267 8.24063C13.6606 8.1022 14.1338 7.79014 14.4713 7.35389C14.8089 6.91768 14.9918 6.3816 14.9918 5.83006Z" fill="#A855F7"/>
          <path d="M17.495 17.4903V15.8311L17.4861 15.6253C17.4461 15.147 17.2688 14.6889 16.973 14.3073C16.6772 13.9257 16.2777 13.6393 15.8244 13.4814L15.6275 13.4214L15.5464 13.3962C15.1518 13.2505 14.9243 12.8267 15.0317 12.4106C15.1392 11.9947 15.5432 11.7337 15.959 11.7971L16.0425 11.8148L16.2078 11.8611C17.0303 12.1101 17.7571 12.6086 18.2852 13.2901C18.8485 14.0167 19.1542 14.9101 19.155 15.8295V17.4903C19.1549 17.9487 18.7833 18.3203 18.325 18.3203C17.8666 18.3203 17.4951 17.9487 17.495 17.4903Z" fill="#A855F7"/>
          <path d="M9.98998 5.82999C9.98998 4.45481 8.8752 3.33999 7.49998 3.33999C6.12479 3.33999 5.00998 4.45481 5.00998 5.82999C5.00998 7.20518 6.12479 8.31999 7.49998 8.31999C8.8752 8.31999 9.98998 7.20518 9.98998 5.82999ZM11.65 5.82999C11.65 8.12197 9.79194 9.97999 7.49998 9.97999C5.208 9.97999 3.34998 8.12197 3.34998 5.82999C3.34998 3.53801 5.208 1.67999 7.49998 1.67999C9.79194 1.67999 11.65 3.53801 11.65 5.82999Z" fill="#A855F7"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-sis-bg-light">
      {/* Sidebar */}
      <SidebarJuridico onSair={handleSair} />

      {/* Conteúdo Principal */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <Header onRegistrarDesvio={handleRegistrarDesvio} userType="juridico" />

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            {/* Título Principal */}
            <div className="mb-8">
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                Dashboard Jurídico
              </h1>
            </div>

            {/* Grid com métricas e atividades */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Área principal - métricas e tabela */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cards de Métricas - Grid 2x2 */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {metricas.map((metrica, index) => (
                    <MetricCard
                      key={index}
                      titulo={metrica.titulo}
                      valor={metrica.valor}
                      descricao={metrica.descricao}
                      icon={metrica.icon}
                    />
                  ))}
                </div>

                {/* Botão Registrar Novo Desvio */}
                <Button
                  onClick={handleRegistrarDesvio}
                  className="w-full h-12 bg-sis-blue hover:bg-blue-700 text-white font-medium text-lg"
                >
                  <svg
                    className="h-5 w-5 mr-4"
                    width="20"
                    height="20"
                    viewBox="0 0 21 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18.2981 10C18.2981 5.87443 14.9537 2.53 10.8281 2.53C6.70256 2.53 3.35812 5.87443 3.35812 10C3.35812 14.1256 6.70256 17.47 10.8281 17.47C14.9537 17.47 18.2981 14.1256 18.2981 10ZM19.9581 10C19.9581 15.0423 15.8705 19.13 10.8281 19.13C5.78576 19.13 1.69812 15.0423 1.69812 10C1.69812 4.95764 5.78576 0.869995 10.8281 0.869995C15.8705 0.869995 19.9581 4.95764 19.9581 10Z" fill="white"/>
                    <path d="M14.1481 9.17C14.6065 9.17 14.9781 9.54159 14.9781 10C14.9781 10.4584 14.6065 10.83 14.1481 10.83L7.5081 10.83C7.04971 10.83 6.6781 10.4584 6.6781 10C6.6781 9.54159 7.04971 9.17 7.5081 9.17L14.1481 9.17Z" fill="white"/>
                    <path d="M9.99817 13.32L9.99817 6.67999C9.99817 6.2216 10.3698 5.84999 10.8282 5.84999C11.2866 5.84999 11.6582 6.2216 11.6582 6.67999L11.6582 13.32C11.6582 13.7784 11.2866 14.15 10.8282 14.15C10.3698 14.15 9.99817 13.7784 9.99817 13.32Z" fill="white"/>
                  </svg>
                  Registrar Novo Desvio
                </Button>

                {/* Processos Aguardando Análise Jurídica (Sindicância) */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl">Processos Aguardando Análise Jurídica (Sindicância)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AwaitingLegalTable />
                  </CardContent>
                </Card>
              </div>

              {/* Atividades Recentes */}
              <div className="lg:col-span-1">
                <Card className="border-sis-border bg-white h-fit">
                  <CardHeader>
                    <CardTitle className="text-xl">Atividades Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 text-sm text-sis-secondary-text">
                      <p>Nenhuma atividade recente.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
