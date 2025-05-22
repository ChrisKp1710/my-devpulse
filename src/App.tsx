import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom"; // <-- cambiato da BrowserRouter a HashRouter
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { invoke } from "@tauri-apps/api/core";
import { getName } from "@tauri-apps/api/app";

// Test iniziale per verificare che le API Tauri funzionino
invoke("greet", { name: "Christian" }).then((res) => {
  console.log(res);
});


getName()
  .then(name => console.log("✅ Ambiente Tauri rilevato:", name))
  .catch(() => console.warn("❌ Non sei in ambiente Tauri!"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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