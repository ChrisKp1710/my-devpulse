// src/components/TerminalDrawer.tsx
import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTerminalDrawerStore } from "@/store/useTerminalDrawerStore";
import { useServer } from "@/context/useServer";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

const TerminalDrawer: React.FC = () => {
  const { isOpen, toggle } = useTerminalDrawerStore();
  const { selectedServer } = useServer();

  const handleLogout = async () => {
    try {
      await invoke("logout_terminal");
      toggle(); // 🔒 Chiude il drawer
      toast.success("💨 Terminale disconnesso");
    } catch (error) {
      console.error("❌ Errore durante logout:", error);
      toast.error("Errore durante il logout");
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ y: isOpen ? 0 : 468, height: isOpen ? 500 : 32 }}
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
            >
              <LogOut size={14} className="mr-1" />
              Logout
            </Button>
          )}
          <button onClick={toggle} className="hover:bg-gray-800 p-1 rounded">
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