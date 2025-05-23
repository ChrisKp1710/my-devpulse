import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getName } from "@tauri-apps/api/app";

const queryClient = new QueryClient();

const TauriInitializer = () => {
  useEffect(() => {
    const testTauriAPIs = async () => {
      try {
        const greeting = await invoke("greet", { name: "Christian" });
        console.log("🎉", greeting);

        const appName = await getName();
        console.log("✅ Ambiente Tauri rilevato:", appName);
      } catch (error) {
        console.warn("❌ Errore Tauri:", error);
      }
    };

    testTauriAPIs();
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system">
      <TooltipProvider>
        <TauriInitializer />
        <Toaster />
        <Sonner />
        <HashRouter>
          <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <div className="flex-1 px-6 py-4">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;