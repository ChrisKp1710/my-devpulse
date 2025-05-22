import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { invoke } from "@tauri-apps/api/core";
import { getName } from "@tauri-apps/api/app";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Componente per i test iniziali di Tauri
const TauriInitializer = () => {
  useEffect(() => {
    // Test iniziale per verificare che le API Tauri funzionino
    const testTauriAPIs = async () => {
      try {
        // Test del comando greet
        const greeting = await invoke("greet", { name: "Christian" });
        console.log("🎉", greeting);

        // Test del nome dell'app
        const appName = await getName();
        console.log("✅ Ambiente Tauri rilevato:", appName);
      } catch (error) {
        console.warn("❌ Errore nell'inizializzazione Tauri:", error);
      }
    };

    testTauriAPIs();
  }, []);

  return null; // Non renderizza nulla
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TauriInitializer />
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;