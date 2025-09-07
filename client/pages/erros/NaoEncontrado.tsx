import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NaoEncontrado = () => {
  const localizacao = useLocation();

  useEffect(() => {
    console.error("Erro 404: Rota não encontrada:", localizacao.pathname);
  }, [localizacao.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Ops! Página não encontrada</p>
        <a href="/" className="text-blue-600 underline hover:text-blue-800">
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
};

export default NaoEncontrado;
