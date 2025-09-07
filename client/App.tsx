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
import UsuariosAdminPage from "./pages/administrador/Usuarios";
import ConfiguracoesSistemaAdminPage from "./pages/administrador/ConfiguracoesSistema";
import JuridicoDashboard from "./pages/juridico/JuridicoDashboard";
import RevisaoProcessoJuridico from "./pages/juridico/RevisaoProcessoJuridico";
import ProcessosAguardandoAnalise from "./pages/juridico/ProcessosAguardandoAnalise";
import TodosProcessos from "./pages/juridico/TodosProcessos";
import Relatorios from "./pages/juridico/Relatorios";
import Configuracoes from "./pages/juridico/Configuracoes";
import GestorRegistrarDesvio from "./pages/gestor/GestorRegistrarDesvio";
import ProcessosPage from "./pages/gestor/Processos";
import ProcessoAcompanhamento from "./pages/gestor/ProcessoAcompanhamento";
import FuncionarioPage from "./pages/gestor/Funcionario";
import FuncionariosListaPage from "./pages/gestor/Funcionarios";

// Mitigate ResizeObserver loop warnings by deferring callbacks to next frame
if (typeof window !== "undefined" && (window as any).ResizeObserver) {
  const OriginalRO = (window as any).ResizeObserver;
  (window as any).ResizeObserver = class extends OriginalRO {
    constructor(callback: ResizeObserverCallback) {
      super((entries: ResizeObserverEntry[], observer: ResizeObserver) => {
        requestAnimationFrame(() => callback(entries, observer));
      });
    }
  };
  // Guard against Chrome's noisy error event for RO loop limit
  window.addEventListener("error", (e: ErrorEvent) => {
    const msg = e?.message || "";
    if (msg.includes("ResizeObserver loop limit exceeded") || msg.includes("ResizeObserver loop completed with undelivered notifications")) {
      e.stopImmediatePropagation();
    }
  }, true);
}

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
          <Route path="/administrador/usuarios" element={<UsuariosAdminPage />} />
          <Route path="/administrador/configuracoes" element={<ConfiguracoesSistemaAdminPage />} />
          <Route path="/juridico" element={<JuridicoDashboard />} />
          <Route path="/juridico/processos/aguardando" element={<ProcessosAguardandoAnalise />} />
          <Route path="/juridico/processos/todos" element={<TodosProcessos />} />
          <Route path="/juridico/relatorios" element={<Relatorios />} />
          <Route path="/juridico/configuracoes" element={<Configuracoes />} />
          <Route path="/juridico/processos/:id" element={<RevisaoProcessoJuridico />} />
          <Route path="/gestor/registrar" element={<GestorRegistrarDesvio />} />
          <Route path="/gestor/processos" element={<ProcessosPage />} />
          <Route path="/gestor/processos/:id" element={<ProcessoAcompanhamento />} />
          <Route path="/gestor/funcionarios" element={<FuncionariosListaPage />} />
          <Route path="/gestor/funcionarios/:id" element={<FuncionarioPage />} />
          {/* ADICIONE TODAS AS ROTAS PERSONALIZADAS ACIMA DA ROTA CATCH-ALL "*" */}
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
