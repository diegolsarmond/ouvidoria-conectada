import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Demandas from "./pages/Demandas";
import DemandaDetalhe from "./pages/DemandaDetalhe";
import Orgaos from "./pages/Orgaos";
import Usuarios from "./pages/Usuarios";
import Vinculos from "./pages/Vinculos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demandas" element={<Demandas />} />
            <Route path="/demandas/:id" element={<DemandaDetalhe />} />
            <Route path="/orgaos" element={<Orgaos />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/vinculos" element={<Vinculos />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
