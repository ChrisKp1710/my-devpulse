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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // ✅ Per forzare reload iframe

  // ✅ Loading SOLO per nuove connessioni
  useEffect(() => {
    if (isConnected && isOpen) {
      // ✅ Controlla se è una riapertura di connessione esistente
      const isReconnecting = sessionStorage.getItem('terminal-reconnecting') === 'true';
      
      if (isReconnecting) {
        // ✅ È una nuova connessione, mostra loading
        setIsLoading(true);
        setLoadError(false);
        sessionStorage.removeItem('terminal-reconnecting'); // Pulisce flag
        
        const loadTimeout = setTimeout(() => {
          console.warn("⚠️ Terminale lento ma funzionante");
          setIsLoading(false);
        }, 15000);

        const errorTimeout = setTimeout(() => {
          setLoadError(true);
          console.error("❌ Timeout definitivo caricamento terminale");
        }, 30000);

        return () => {
          clearTimeout(loadTimeout);
          clearTimeout(errorTimeout);
        };
      } else {
        // ✅ È una riapertura, nessun loading
        setIsLoading(false);
        setLoadError(false);
      }
    } else {
      setIsLoading(false);
      setLoadError(false);
    }
  }, [isConnected, isOpen]);

  const handleLogout = async () => {
    try {
      const result = await invoke<TerminalStatus>("logout_terminal");
      disconnect();
      toast.success("💨 " + result.message);
      console.log("🔒 Connessione SSH chiusa completamente");
      setIframeKey(prev => prev + 1); // ✅ Resetta iframe
    } catch (error) {
      console.error("❌ Errore durante logout:", error);
      toast.error("Errore durante il logout");
    }
  };

  const handleToggle = () => {
    toggle();
    console.log(isOpen ? "📱 Drawer chiuso" : "📱 Drawer riaperto");
  };

  // ✅ GESTIONE CARICAMENTO IFRAME più intelligente
  const handleIframeLoad = () => {
    console.log("✅ iframe terminale caricato");
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    console.error("❌ Errore iframe terminale");
    setIsLoading(false);
    setLoadError(true);
  };

  // ✅ RETRY più intelligente
  const handleRetry = () => {
    console.log("🔄 Retry caricamento terminale");
    setLoadError(false);
    setIsLoading(true);
    setIframeKey(prev => prev + 1); // Forza reload iframe
    
    // Nuovo timeout per retry
    setTimeout(() => {
      setIsLoading(false);
    }, 10000);
  };

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
          {/* ✅ Stato più chiaro */}
          {isLoading && (
            <span className="text-blue-400 text-xs">(caricamento)</span>
          )}
          {loadError && (
            <span className="text-yellow-400 text-xs">(ricarica necessaria)</span>
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
            title={isOpen ? "Nascondi terminale" : "Mostra terminale"}
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 bg-black relative">
        {/* ✅ Loading overlay SOLO per poco tempo */}
        {isLoading && isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
              <p className="text-green-500 text-sm font-mono">
                Caricamento interfaccia...
              </p>
              <p className="text-gray-400 text-xs font-mono mt-1">
                SSH già connesso, preparazione terminale
              </p>
            </div>
          </div>
        )}

        {/* ✅ Error overlay SOLO quando necessario */}
        {loadError && !isLoading && isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-10">
            <div className="text-center">
              <p className="text-yellow-400 text-sm font-mono mb-2">
                ⚠️ Interfaccia terminale non risponde
              </p>
              <p className="text-gray-400 text-xs font-mono mb-4">
                SSH funziona, problema con ttyd
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
              >
                🔄 Ricarica Interfaccia
              </Button>
            </div>
          </div>
        )}

        {/* ✅ Terminal iframe */}
        {isConnected && (
          <iframe
            key={iframeKey} // ✅ Forza reload quando necessario
            src="http://localhost:7681"
            className={`w-full h-full border-none ${isOpen ? 'block' : 'hidden'}`}
            title="DevPulse Terminal"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>
    </motion.div>
  );
};

export default TerminalDrawer;