import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Demandas from "./pages/Demandas";
import DemandaDetalhe from "./pages/DemandaDetalhe";
import Orgaos from "./pages/Orgaos";
import Usuarios from "./pages/Usuarios";
import Vinculos from "./pages/Vinculos";
import AssistantPrompts from "./pages/AssistantPrompts";
import NotFound from "./pages/NotFound";
import NovaDemandaPublica from "./pages/NovaDemandaPublica";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/demandas" element={<Demandas />} />
                <Route path="/demandas/:id" element={<DemandaDetalhe />} />
                <Route path="/orgaos" element={<Orgaos />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/vinculos" element={<Vinculos />} />
                <Route path="/assistant-prompts" element={<AssistantPrompts />} />
              </Route>
            </Route>
            <Route path="/nova-demanda" element={<NovaDemandaPublica />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
