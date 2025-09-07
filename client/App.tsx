import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import NaoEncontrado from "./pages/NaoEncontrado";
import GestorDashboard from "./pages/GestorDashboard";
import AdministradorDashboard from "./pages/AdministradorDashboard";
import JuridicoDashboard from "./pages/JuridicoDashboard";
import GestorRegistrarDesvio from "./pages/GestorRegistrarDesvio";

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
          {/* ADICIONE TODAS AS ROTAS PERSONALIZADAS ACIMA DA ROTA CATCH-ALL "*" */}
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
