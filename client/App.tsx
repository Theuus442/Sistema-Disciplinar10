import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/autenticacao/Login";
import NaoEncontrado from "./pages/erros/NaoEncontrado";
import GestorDashboard from "./pages/gestor/GestorDashboard";
import AdministradorDashboard from "./pages/administrador/AdministradorDashboard";
import JuridicoDashboard from "./pages/juridico/JuridicoDashboard";
import GestorRegistrarDesvio from "./pages/gestor/GestorRegistrarDesvio";
import ProcessosPage from "./pages/gestor/Processos";
import ProcessoAcompanhamento from "./pages/gestor/ProcessoAcompanhamento";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/gestor" element={<GestorDashboard />} />
          <Route path="/administrador" element={<AdministradorDashboard />} />
          <Route path="/juridico" element={<JuridicoDashboard />} />
          <Route path="/gestor/registrar" element={<GestorRegistrarDesvio />} />
          <Route path="/gestor/processos" element={<ProcessosPage />} />
          <Route path="/gestor/processos/:id" element={<ProcessoAcompanhamento />} />
          {/* ADICIONE TODAS AS ROTAS PERSONALIZADAS ACIMA DA ROTA CATCH-ALL "*" */}
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
