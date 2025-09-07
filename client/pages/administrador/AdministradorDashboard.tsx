import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SidebarAdministrador from "@/components/SidebarAdministrador";
import CartaoMetrica from "@/components/CartaoMetrica";
import UltimosLogins from "@/components/UltimosLogins";
import AtividadesRecentes from "@/components/AtividadesRecentes";
import AcoesRapidas from "@/components/AcoesRapidas";

export default function AdministradorDashboard() {
  const navigate = useNavigate();

  const handleSair = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-sis-bg-light">
      {/* Header */}
      <Header 
        userType="administrador" 
        placeholder="Buscar usuários ou configurações..."
      />

      {/* Layout principal */}
      <div className="flex">
        {/* Sidebar */}
        <SidebarAdministrador onSair={handleSair} />

        {/* Conteúdo principal */}
        <div className="flex-1 p-6">
          {/* Título principal */}
          <div className="mb-6">
            <h1 className="font-open-sans text-[30px] font-bold leading-[36px] text-sis-dark-text">
              Dashboard do Administrador
            </h1>
          </div>

          {/* Grid de cartões */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Primeira linha */}
            <CartaoMetrica
              titulo="Total de Usuários Ativos"
              valor="1.234"
              descricao="12% acima do mês passado"
              corValor="text-sis-blue"
              icon={
                <svg
                  className="h-6 w-6"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M15 21V19C15 18.2044 14.6837 17.4415 14.1211 16.8789C13.6289 16.3867 12.9835 16.0829 12.2969 16.0146L12 16L6 16C5.20435 16 4.44152 16.3163 3.87891 16.8789C3.3163 17.4415 3 18.2044 3 19L3 21C3 21.5523 2.55228 22 2 22C1.44772 22 1 21.5523 1 21L1 19C1 17.6739 1.52716 16.4025 2.46484 15.4648C3.40253 14.5272 4.67392 14 6 14L12 14L12.248 14.0059C13.4838 14.0672 14.6561 14.5858 15.5352 15.4648C16.4728 16.4025 17 17.6739 17 19V21C17 21.5523 16.5523 22 16 22C15.4477 22 15 21.5523 15 21Z" fill="currentColor"/>
                  <path d="M17.9961 7.00008C17.9961 6.33559 17.7757 5.6897 17.3691 5.16415C17.0132 4.70415 16.5321 4.35885 15.9863 4.16805L15.749 4.09579L15.6514 4.06551C15.1761 3.88941 14.9023 3.37825 15.0322 2.87704C15.1622 2.37596 15.6495 2.06289 16.1504 2.13973L16.251 2.16024L16.4502 2.2159C17.4406 2.51689 18.3146 3.11916 18.9502 3.94051C19.628 4.81649 19.9961 5.89248 19.9961 7.00008C19.9961 8.10769 19.628 9.18367 18.9502 10.0597C18.2723 10.9356 17.3232 11.562 16.251 11.8399C15.7164 11.9785 15.1709 11.6576 15.0322 11.1231C14.8936 10.5886 15.2145 10.043 15.749 9.90438C16.3923 9.7376 16.9624 9.36162 17.3691 8.83602C17.7758 8.31046 17.9961 7.66459 17.9961 7.00008Z" fill="currentColor"/>
                  <path d="M21 21.0001V19.0011L20.9893 18.7531C20.9411 18.1769 20.7275 17.6249 20.3711 17.1652C20.0147 16.7054 19.5334 16.3604 18.9873 16.1701L18.75 16.0978L18.6523 16.0675C18.1769 15.8919 17.9028 15.3813 18.0322 14.88C18.1617 14.3789 18.6485 14.0645 19.1494 14.1408L19.25 14.1622L19.4492 14.2179C20.4401 14.518 21.3158 15.1186 21.9521 15.9396C22.6308 16.8151 22.9991 17.8914 23 18.9992V21.0001C22.9999 21.5524 22.5522 22.0001 22 22.0001C21.4478 22.0001 21.0001 21.5524 21 21.0001Z" fill="currentColor"/>
                  <path d="M12 7C12 5.34315 10.6569 4 9 4C7.34315 4 6 5.34315 6 7C6 8.65685 7.34315 10 9 10C10.6569 10 12 8.65685 12 7ZM14 7C14 9.76142 11.7614 12 9 12C6.23858 12 4 9.76142 4 7C4 4.23858 6.23858 2 9 2C11.7614 2 14 4.23858 14 7Z" fill="currentColor"/>
                </svg>
              }
            />

            <CartaoMetrica
              titulo="Status do Sistema"
              valor="Operacional"
              descricao="Nenhuma interrupção detectada"
              corValor="text-green-500"
              icon={
                <svg
                  className="h-6 w-6"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M21 8V4C21 3.73478 20.8946 3.48051 20.707 3.29297C20.5195 3.10543 20.2652 3 20 3L4 3C3.73478 3 3.48051 3.10543 3.29297 3.29297C3.10543 3.48051 3 3.73478 3 4L3 8L3.00488 8.09863C3.02757 8.32763 3.12883 8.54289 3.29297 8.70703C3.48051 8.89457 3.73478 9 4 9H4.5C5.05228 9 5.5 9.44772 5.5 10C5.5 10.5523 5.05228 11 4.5 11H4C3.20435 11 2.44152 10.6837 1.87891 10.1211C1.38671 9.6289 1.08291 8.98351 1.01465 8.29688L1 8L1 4C1 3.20435 1.3163 2.44152 1.87891 1.87891C2.44152 1.3163 3.20435 1 4 1L20 1C20.7956 1 21.5585 1.3163 22.1211 1.87891C22.6837 2.44152 23 3.20435 23 4V8C23 8.79565 22.6837 9.55849 22.1211 10.1211C21.5585 10.6837 20.7957 11 20 11H19.5C18.9477 11 18.5 10.5523 18.5 10C18.5 9.44772 18.9477 9 19.5 9H20C20.2652 9 20.5195 8.89457 20.707 8.70703C20.8946 8.51949 21 8.26522 21 8Z" fill="currentColor"/>
                  <path d="M1 20L1 16C1 15.2044 1.3163 14.4415 1.87891 13.8789C2.44152 13.3163 3.20435 13 4 13H4.5C5.05228 13 5.5 13.4477 5.5 14C5.5 14.5523 5.05228 15 4.5 15H4C3.73478 15 3.48051 15.1054 3.29297 15.293C3.10543 15.4805 3 15.7348 3 16L3 20L3.00488 20.0986C3.02757 20.3276 3.12883 20.5429 3.29297 20.707C3.48051 20.8946 3.73478 21 4 21L20 21C20.2652 21 20.5195 20.8946 20.707 20.707C20.8946 20.5195 21 20.2652 21 20V16C21 15.7348 20.8946 15.4805 20.707 15.293C20.5195 15.1054 20.2652 15 20 15H19.5C18.9477 15 18.5 14.5523 18.5 14C18.5 13.4477 18.9477 13 19.5 13H20C20.7957 13 21.5585 13.3163 22.1211 13.8789C22.6837 14.4415 23 15.2043 23 16V20C23 20.7957 22.6837 21.5585 22.1211 22.1211C21.5585 22.6837 20.7957 23 20 23L4 23C3.20435 23 2.44152 22.6837 1.87891 22.1211C1.38671 21.6289 1.08291 20.9835 1.01465 20.2969L1 20Z" fill="currentColor"/>
                </svg>
              }
            />

            <UltimosLogins />

            {/* Segunda linha */}
            <AtividadesRecentes />
            <AcoesRapidas />
          </div>
        </div>
      </div>
    </div>
  );
}
