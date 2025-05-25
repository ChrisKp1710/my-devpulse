import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
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

  const handleLogout = async () => {
    try {
      const result = await invoke<TerminalStatus>("logout_terminal");
      disconnect(); // ✅ Usa disconnect() invece di close()
      toast.success("💨 " + result.message);
      console.log("🔒 Connessione SSH chiusa completamente");
    } catch (error) {
      console.error("❌ Errore durante logout:", error);
      toast.error("Errore durante il logout");
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      // ✅ Se chiudi il drawer, NON fare logout automatico
      toggle();
      console.log("📱 Drawer chiuso - connessione SSH rimane attiva");
    } else {
      // ✅ Se riapri il drawer, controlla se c'è connessione
      toggle();
      console.log("📱 Drawer riaperto");
    }
  };

  // ✅ LOGICA DEI 3 STATI
  const getDrawerState = () => {
    if (!isConnected) {
      // 🔴 DISCONNESSO = Completamente nascosto
      return { y: 500, height: 0, visible: false };
    } else if (isConnected && !isOpen) {
      // 🟡 CONNESSO MA CHIUSO = Solo header visibile
      return { y: 468, height: 32, visible: true };
    } else {
      // 🟢 CONNESSO E APERTO = Terminale completo
      return { y: 0, height: 500, visible: true };
    }
  };

  const drawerState = getDrawerState();

  // Se non è connesso e non è visibile, non renderizzare nulla
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
        <div className="text-sm font-mono">
          DevPulse Terminal {selectedServer ? `– ${selectedServer.name}` : ""}
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

      {/* Terminal iframe */}
      <div className="flex-1 bg-black">
        {isOpen && (
          <iframe
            src="http://localhost:7681"
            className="w-full h-full border-none"
            title="DevPulse Terminal"
          />
        )}
      </div>
    </motion.div>
  );
};

export default TerminalDrawer;