// src/components/TerminalDrawer.tsx
import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTerminalDrawerStore } from "@/store/useTerminalDrawerStore";

const TerminalDrawer: React.FC = () => {
  const { isOpen, toggle } = useTerminalDrawerStore();

  return (
    <motion.div
      initial={false}
      animate={{ y: isOpen ? 0 : "calc(100% - 32px)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 h-[500px] bg-black border-t border-gray-700 shadow-2xl z-[9999] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-white">
        <div className="text-sm font-mono">DevPulse Terminal - ttyd</div>
        <button
          onClick={toggle}
          className="hover:bg-gray-800 p-1 rounded"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Contenuto: iframe ttyd */}
      <div className="flex-1">
        <iframe
          src="http://localhost:7681"
          className="w-full h-full border-none"
          title="DevPulse Terminal"
        />
      </div>
    </motion.div>
  );
};

export default TerminalDrawer;