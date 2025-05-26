// src/App.tsx - VERSIONE MIGLIORATA
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import Navbar from "@/components/Navbar";
import TerminalDrawer from "@/components/TerminalDrawer";
import Index from "@/pages/Index";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import { ServerProvider } from "@/context/ServerContext";
import { SetupDialog } from "@/components/SetupDialog";

import { invoke } from "@tauri-apps/api/core";
import { getName } from "@tauri-apps/api/app";

// ✅ Aggiungi l'interfaccia SystemInfo
interface SystemInfo {
  platform: string;
  arch: string;
  os_version: string;
  chip: string;
  supported: boolean;
  has_homebrew: boolean;
  has_sshpass: boolean;
  ttyd_bundled_path: string;
  ttyd_bundled_ok: boolean;
  homebrew_path?: string;
  needs_setup: boolean;
  ready_for_ssh: boolean;
  setup_message: string;
  mac_model?: string;
}

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

const App = () => {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null); // ✅ null = checking
  const [systemReady, setSystemReady] = useState<boolean>(false);

  // ✅ CONTROLLO INTELLIGENTE: Sempre verifica se il sistema è davvero pronto
  useEffect(() => {
    const checkSystemReady = async () => {
      try {
        console.log("🔍 Checking if system is really ready...");
        
        const systemInfo = await invoke<SystemInfo>("check_system_info");
        console.log("📋 System check result:", systemInfo);
        
        const reallyReady = systemInfo.ready_for_ssh === true;
        const wasCompleted = localStorage.getItem("devpulse-setup-completed") === "true";
        
        console.log(`🎯 System ready: ${reallyReady}, localStorage says: ${wasCompleted}`);
        
        if (reallyReady) {
          // ✅ Sistema davvero pronto
          setSystemReady(true);
          setSetupCompleted(true);
          if (!wasCompleted) {
            localStorage.setItem("devpulse-setup-completed", "true");
            console.log("💾 Saved setup completion to localStorage");
          }
        } else {
          // ❌ Sistema NON pronto, rimuovi flag localStorage se esiste
          setSystemReady(false);
          setSetupCompleted(false);
          if (wasCompleted) {
            localStorage.removeItem("devpulse-setup-completed");
            console.log("🗑️ Removed stale localStorage flag");
          }
        }
      } catch (error) {
        console.error("❌ Error checking system:", error);
        setSetupCompleted(false);
        setSystemReady(false);
      }
    };

    checkSystemReady();
  }, []);

  const handleSetupFinish = async () => {
    console.log("🎉 Setup finished! Verifying system...");
    
    // ✅ Verifica finale prima di procedere
    try {
      const systemInfo = await invoke<SystemInfo>("check_system_info");
      if (systemInfo.ready_for_ssh) {
        localStorage.setItem("devpulse-setup-completed", "true");
        setSetupCompleted(true);
        setSystemReady(true);
        console.log("✅ Setup verified and completed");
      } else {
        console.warn("⚠️ Setup not properly completed, keeping dialog open");
      }
    } catch (error) {
      console.error("❌ Error verifying setup:", error);
    }
  };

  // ✅ Mostra loading durante il check iniziale
  if (setupCompleted === null) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <TooltipProvider>
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking system...</p>
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system">
        <TooltipProvider>
          <TauriInitializer />
          <Toaster />
          <Sonner />
          <ServerProvider>
            <HashRouter>
              {!setupCompleted && <SetupDialog onFinish={handleSetupFinish} />}
              {setupCompleted && systemReady && (
                <div className="min-h-screen flex flex-col bg-background">
                  <Navbar />
                  <div className="flex-1 px-6 py-4">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                  <TerminalDrawer />
                </div>
              )}
            </HashRouter>
          </ServerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;