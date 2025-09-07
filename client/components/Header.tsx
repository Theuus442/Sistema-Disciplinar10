import { useState } from "react";

interface HeaderProps {
  onRegistrarDesvio?: () => void;
  userType?: "gestor" | "juridico" | "administrador";
  placeholder?: string;
}

export default function Header({ onRegistrarDesvio, userType = "gestor", placeholder }: HeaderProps) {
  const [buscaTexto, setBuscaTexto] = useState("");

  const getMenuItems = () => {
    switch (userType) {
      case "juridico":
        return [
          { label: "Home", active: true },
          { label: "Processos", active: false },
          { label: "Relatórios", active: false },
          { label: "Configurações", active: false },
        ];
      case "administrador":
        return [
          { label: "Home", active: true },
          { label: "Processos", active: false },
          { label: "Funcionários", active: false },
          { label: "Relatórios", active: false },
        ];
      default: // gestor
        return [
          { label: "Home", active: true },
          { label: "Processos", active: false },
          { label: "Funcionários", active: false },
        ];
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return userType === "juridico"
      ? "Buscar processos jurídicos..."
      : "Buscar processos ou funcionários...";
  };

  return (
    <div className="flex h-16 w-full items-center justify-center border-b border-sis-border bg-white shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      <div className="flex w-full items-center">
        {/* Logo */}
        <div className="flex items-center px-6">
          <svg
            className="h-8 w-8 flex-shrink-0"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" stroke="white" />
            <path d="M12.6332 21.5745C12.8848 20.6356 13.8498 20.0785 14.7887 20.3301C15.7276 20.5816 16.2848 21.5467 16.0332 22.4855L14.7011 27.4571C14.5595 27.9852 14.0167 28.2986 13.4886 28.1571L12.0011 27.7585C11.473 27.617 11.1596 27.0742 11.3011 26.546L12.6332 21.5745Z" fill="#0F74C7" />
            <path d="M19.0929 19.0235C19.7801 18.3362 20.8947 18.3362 21.5819 19.0235L25.3322 22.7737C25.7188 23.1604 25.7188 23.7873 25.3322 24.1738L24.2433 25.2627C23.8566 25.6494 23.2298 25.6494 22.8432 25.2627L19.0929 21.5125C18.4056 20.8252 18.4056 19.7109 19.0929 19.0235Z" fill="#0F74C7" />
            <path d="M9.81535 15.734C10.7542 15.4824 11.7193 16.0397 11.9709 16.9785C12.2224 17.9174 11.6653 18.8825 10.7264 19.1341L5.43437 20.5521C4.90624 20.6936 4.36338 20.3802 4.22186 19.8521L3.82329 18.3645C3.68177 17.8364 3.99518 17.2936 4.52332 17.1521L9.81535 15.734Z" fill="#0F74C7" />
            <path d="M20.5798 1.69428C21.108 1.8358 21.4213 2.37865 21.2799 2.90678L17.6663 16.3927C17.4147 17.3316 16.4497 17.8887 15.5107 17.6373C14.5719 17.3857 14.0147 16.4206 14.2662 15.4817L17.8797 1.99574C18.0212 1.46761 18.5641 1.15419 19.0922 1.2957L20.5798 1.69428Z" fill="#0F74C7" />
            <path d="M28.3225 13.3943C28.464 13.9224 28.1506 14.4653 27.6225 14.6068L22.3985 16.0065C21.4596 16.258 20.4946 15.7009 20.243 14.762C19.9915 13.8231 20.5486 12.858 21.4875 12.6065L26.7115 11.2068C27.2396 11.0653 27.7824 11.3787 27.9239 11.9068L28.3225 13.3943Z" fill="#0F74C7" />
            <path d="M12.9709 10.4126C13.6583 11.0999 13.6583 12.2142 12.9709 12.9016C12.2836 13.5889 11.1693 13.5889 10.482 12.9016L4.28264 6.70221C3.89602 6.31559 3.89602 5.68876 4.28264 5.30214L5.37153 4.21324C5.75816 3.82662 6.38498 3.82662 6.77161 4.21324L12.9709 10.4126Z" fill="#0F74C7" />
          </svg>
          <h1 className="ml-2 font-open-sans text-xl font-bold italic text-sis-blue xl:text-[25px] xl:leading-[25px]">
            SisDisciplinar
          </h1>
        </div>

        {/* Menu de Navegação */}
        <div className="flex items-center space-x-6 pl-32">
          {getMenuItems().map((item, index) => (
            <button
              key={index}
              className={`font-roboto text-sm ${
                item.active
                  ? "font-semibold text-sis-blue"
                  : "text-sis-dark-text hover:text-sis-blue"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Área da Direita */}
        <div className="ml-auto flex items-center space-x-4 pr-6">
          {/* Barra de Busca */}
          <div className="relative flex h-9 w-64 items-center rounded-md border border-sis-border bg-white px-3">
            <svg
              className="h-4 w-4 text-sis-dark-text"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.6224 10.6224C10.8677 10.3771 11.2556 10.362 11.5188 10.5766L11.5698 10.6224L14.4775 13.5301L14.524 13.5811C14.7384 13.8443 14.7227 14.2323 14.4775 14.4775C14.2323 14.7227 13.8443 14.7384 13.5811 14.524L13.5301 14.4775L10.6224 11.5698L10.5766 11.5188C10.362 11.2556 10.3771 10.8677 10.6224 10.6224Z" fill="currentColor" />
              <path d="M12.02 7.32999C12.02 4.73977 9.92027 2.63999 7.33005 2.63999C4.73984 2.63999 2.64005 4.73977 2.64005 7.32999C2.64005 9.92021 4.73984 12.02 7.33005 12.02C9.92027 12.02 12.02 9.92021 12.02 7.32999ZM13.36 7.32999C13.36 10.6603 10.6604 13.36 7.33005 13.36C3.99977 13.36 1.30005 10.6603 1.30005 7.32999C1.30005 3.99971 3.99977 1.29999 7.33005 1.29999C10.6604 1.29999 13.36 3.99971 13.36 7.32999Z" fill="currentColor" />
            </svg>
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar processos ou funcionários..."
              className="ml-3 flex-1 font-roboto text-sm text-sis-dark-text placeholder:text-opacity-40 placeholder:text-sis-dark-text focus:outline-none"
            />
          </div>

          {/* Botões de Ação */}
          <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-100">
            <svg
              className="h-4 w-4 text-sis-secondary-text"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.6225 10.6224C10.8678 10.3771 11.2557 10.362 11.5189 10.5766L11.57 10.6224L14.4776 13.5301L14.5241 13.5811C14.7385 13.8443 14.7228 14.2323 14.4776 14.4775C14.2324 14.7227 13.8444 14.7384 13.5812 14.524L13.5302 14.4775L10.6225 11.5698L10.5768 11.5188C10.3621 11.2556 10.3772 10.8677 10.6225 10.6224Z" fill="currentColor" />
              <path d="M12.02 7.32999C12.02 4.73977 9.92027 2.63999 7.33005 2.63999C4.73984 2.63999 2.64005 4.73977 2.64005 7.32999C2.64005 9.92021 4.73984 12.02 7.33005 12.02C9.92027 12.02 12.02 9.92021 12.02 7.32999ZM13.36 7.32999C13.36 10.6603 10.6604 13.36 7.33005 13.36C3.99977 13.36 1.30005 10.6603 1.30005 7.32999C1.30005 3.99971 3.99977 1.29999 7.33005 1.29999C10.6604 1.29999 13.36 3.99971 13.36 7.32999Z" fill="currentColor" />
            </svg>
          </button>

          <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-100">
            <svg
              className="h-4 w-4 text-sis-secondary-text"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8.61727 13.6025C8.81585 13.3269 9.19487 13.2413 9.4953 13.4147C9.7958 13.5881 9.91137 13.9594 9.77208 14.2692L9.74072 14.33C9.56431 14.6355 9.31065 14.8891 9.00526 15.0655C8.69981 15.2418 8.35295 15.3349 8.00026 15.335C7.64751 15.335 7.30078 15.2418 6.99526 15.0655C6.72787 14.9111 6.50013 14.6976 6.32919 14.4419L6.25918 14.33L6.22777 14.2692C6.08852 13.9594 6.20411 13.5881 6.50454 13.4147C6.80498 13.2413 7.184 13.3269 7.38259 13.6025L7.41991 13.66L7.46835 13.7333C7.52168 13.8028 7.58888 13.8613 7.66526 13.9054C7.76704 13.9641 7.88275 13.995 8.00026 13.995C8.11778 13.9949 8.23349 13.9641 8.33526 13.9054C8.43704 13.8466 8.52119 13.7618 8.57995 13.66L8.61727 13.6025Z" fill="currentColor" />
              <path d="M11.3498 5.32501C11.3498 4.43665 10.9971 3.58468 10.369 2.95645C9.74076 2.32821 8.88832 1.97501 7.99983 1.97501C7.11141 1.97506 6.25947 2.32825 5.63126 2.95645C5.00307 3.58469 4.64982 4.43658 4.64982 5.32501L4.6472 5.61552C4.61852 7.03921 4.37753 8.05687 4.00206 8.85169C3.60645 9.68912 3.08147 10.2297 2.64047 10.685L13.3598 10.685C12.9179 10.2295 12.3936 9.68859 11.9983 8.85169C11.5976 8.00367 11.3498 6.90226 11.3498 5.32501ZM12.6898 5.32501C12.6898 6.76196 12.9149 7.65587 13.2093 8.27917C13.4307 8.74777 13.7035 9.09195 14.0141 9.42876L14.3367 9.76771L14.3511 9.78339C14.5258 9.97548 14.6412 10.2141 14.6828 10.4704C14.7244 10.7266 14.6909 10.9894 14.586 11.2268C14.4809 11.4642 14.3089 11.6662 14.0913 11.8078C13.9009 11.9317 13.6823 12.0054 13.4566 12.0217L13.3598 12.025L2.63982 12.025C2.38011 12.0248 2.12581 11.949 1.90831 11.8071C1.6908 11.6652 1.51909 11.4631 1.41432 11.2254C1.30958 10.9879 1.2762 10.7247 1.31814 10.4685C1.36009 10.2123 1.47559 9.97387 1.65052 9.78205L1.66426 9.76704L1.98683 9.42876C2.29692 9.09208 2.56895 8.74777 2.79031 8.27917C3.06634 7.6948 3.28139 6.87264 3.3072 5.58804L3.30982 5.32501C3.30982 4.08114 3.80429 2.88792 4.68384 2.00838C5.56332 1.12903 6.75611 0.635057 7.99983 0.63501C9.24362 0.63501 10.4369 1.12889 11.3165 2.00838C12.196 2.88792 12.6898 4.08114 12.6898 5.32501Z" fill="currentColor" />
            </svg>
          </button>

          {/* Botão Registrar Desvio */}
          <button
            onClick={onRegistrarDesvio}
            className="flex h-10 items-center rounded-md bg-sis-blue px-4 font-roboto text-sm font-medium text-white hover:bg-blue-700"
          >
            + Registrar Desvio
          </button>

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-red-100">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/dbaa4ceeb2b08acf1ddb3e12ea5ca87b8a7d2470?width=72"
              alt="Avatar do usuário"
              className="h-9 w-9 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
