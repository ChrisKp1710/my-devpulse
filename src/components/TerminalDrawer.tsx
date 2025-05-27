import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTerminalDrawerStore } from "@/store/useTerminalDrawerStore";
import { useServer } from "@/context/useServer";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

interface TerminalStatus {
  is_connected: boolean;
  message: string;
}

const TerminalDrawer: React.FC = () => {
  const { isOpen, isConnected, toggle, disconnect } = useTerminalDrawerStore();
  const { selectedServer } = useServer();
  const [isLoading, setIsLoading] = useState(false); // ✅ Stato di caricamento
  const [loadError, setLoadError] = useState(false); // ✅ Stato errore

  // ✅ Gestisce il caricamento dell'iframe
  useEffect(() => {
    if (isOpen && isConnected) {
      setIsLoading(true);
      setLoadError(false);
      
      // Timeout per il caricamento
      const loadTimeout = setTimeout(() => {
        setIsLoading(false);
        setLoadError(true);
        console.warn("⚠️ Timeout caricamento terminale");
      }, 10000); // 10 secondi timeout

      return () => clearTimeout(loadTimeout);
    }
  }, [isOpen, isConnected]);

  const handleLogout = async () => {
    try {
      const result = await invoke<TerminalStatus>("logout_terminal");
      disconnect();
      toast.success("💨 " + result.message);
      console.log("🔒 Connessione SSH chiusa completamente");
    } catch (error) {
      console.error("❌ Errore durante logout:", error);
      toast.error("Errore durante il logout");
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      toggle();
      console.log("📱 Drawer chiuso - connessione SSH rimane attiva");
    } else {
      toggle();
      console.log("📱 Drawer riaperto");
    }
  };

  // ✅ Gestisce il caricamento dell'iframe
  const handleIframeLoad = () => {
    console.log("✅ iframe terminale caricato correttamente");
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    console.error("❌ Errore caricamento iframe terminale");
    setIsLoading(false);
    setLoadError(true);
  };

  // ✅ LOGICA DEI 3 STATI
  const getDrawerState = () => {
    if (!isConnected) {
      return { y: 500, height: 0, visible: false };
    } else if (isConnected && !isOpen) {
      return { y: 468, height: 32, visible: true };
    } else {
      return { y: 0, height: 500, visible: true };
    }
  };

  const drawerState = getDrawerState();

  if (!drawerState.visible) {
    return null;
  }

  return (
    <motion.div
      initial={false}
      animate={{ y: drawerState.y, height: drawerState.height }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 shadow-2xl z-[9999] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-white">
        <div className="text-sm font-mono flex items-center gap-2">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          DevPulse Terminal {selectedServer ? `– ${selectedServer.name}` : ""}
          {loadError && (
            <span className="text-yellow-400 text-xs">(caricamento lento)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <Button
              variant="destructive"
              size="sm"
              className="text-xs px-2 py-1 h-7"
              onClick={handleLogout}
              title="Chiudi connessione SSH definitivamente"
            >
              <LogOut size={14} className="mr-1" />
              Logout
            </Button>
          )}
          <button 
            onClick={handleToggle} 
            className="hover:bg-gray-800 p-1 rounded"
            title={isOpen ? "Nascondi terminale (connessione rimane attiva)" : "Mostra terminale"}
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 bg-black relative">
        {isOpen && (
          <>
            {/* ✅ Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
                  <p className="text-green-500 text-sm font-mono">
                    Caricamento terminale...
                  </p>
                  <p className="text-gray-400 text-xs font-mono mt-1">
                    Connessione SSH in corso
                  </p>
                </div>
              </div>
            )}

            {/* ✅ Error overlay */}
            {loadError && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-10">
                <div className="text-center">
                  <p className="text-yellow-400 text-sm font-mono mb-2">
                    ⚠️ Terminale in caricamento lento
                  </p>
                  <p className="text-gray-400 text-xs font-mono">
                    Se persiste, prova a riavviare la connessione
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setLoadError(false);
                      setIsLoading(true);
                      // Forza reload dell'iframe
                      const iframe = document.querySelector('#terminal-iframe') as HTMLIFrameElement;
                      if (iframe) {
                        const currentSrc = iframe.src;
                        iframe.src = '';
                        setTimeout(() => {
                          iframe.src = currentSrc;
                        }, 100);
                      }
                    }}
                  >
                    Riprova
                  </Button>
                </div>
              </div>
            )}

            {/* ✅ Terminal iframe con gestione eventi */}
            <iframe
              id="terminal-iframe"
              src="http://localhost:7681"
              className="w-full h-full border-none"
              title="DevPulse Terminal"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </>
        )}
      </div>
    </motion.div>
  );
};

export default TerminalDrawer;