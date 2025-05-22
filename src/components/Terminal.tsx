import { useRef, useEffect, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";
import { X, Minimize2 } from "lucide-react";
import { useServer } from "@/context/useServer";

const TerminalComponent: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("~");
  const { selectedServer, sshSessionId, toggleTerminal } = useServer();

  // Funzione per mostrare il prompt (memoizzata con useCallback)
  const showPrompt = useCallback((terminal: Terminal) => {
    const user = selectedServer?.sshUser || "user";
    const host = selectedServer?.name || "server";
    terminal.write(`\r\n\x1b[32m${user}@${host}\x1b[0m:\x1b[34m${currentPath}\x1b[0m$ `);
  }, [selectedServer?.sshUser, selectedServer?.name, currentPath]);

  useEffect(() => {
    if (!selectedServer || !sshSessionId || !terminalRef.current || term) return;

    console.log("🖥️ Inizializzazione terminale per:", selectedServer.name);

    // Crea il terminale
    const terminalInstance = new Terminal({
      fontFamily: '"Cascadia Code", "Fira Code", "Monaco", monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: "block",
      theme: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selectionBackground: "#3b82f6", // Cambiato da 'selection' a 'selectionBackground'
        black: "#000000",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#bfbfbf",
        brightBlack: "#4d4d4d",
        brightRed: "#ff6e67",
        brightGreen: "#5af78e",
        brightYellow: "#f4f99d",
        brightBlue: "#caa9fa",
        brightMagenta: "#ff92d0",
        brightCyan: "#9aedfe",
        brightWhite: "#e6e6e6"
      },
      rows: 24,
      cols: 80,
    });

    // Addon per il fit
    const fitAddonInstance = new FitAddon();
    terminalInstance.loadAddon(fitAddonInstance);

    // Apri il terminale
    terminalInstance.open(terminalRef.current);
    fitAddonInstance.fit();

    setTerm(terminalInstance);
    setFitAddon(fitAddonInstance);

    // Messaggio di benvenuto
    terminalInstance.writeln(`\r\n🔗 Connesso a ${selectedServer.name} (${selectedServer.ip})`);
    terminalInstance.writeln(`📡 Sessione SSH: ${sshSessionId}`);
    terminalInstance.writeln(`\r\n✨ Benvenuto nel terminale interattivo!`);
    showPrompt(terminalInstance);

    let currentCommand = "";

    // Gestione input
    terminalInstance.onData(async (data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        terminalInstance.write("\r\n");
        
        if (currentCommand.trim()) {
          try {
            const result = await invoke<string>("execute_ssh_command", {
              sessionId: sshSessionId,
              command: currentCommand.trim()
            });
            
            terminalInstance.writeln(result);
            
            // Aggiorna il path se è un comando cd
            if (currentCommand.trim().startsWith("cd ")) {
              // Simuliamo il cambio directory
              const newPath = currentCommand.trim().substring(3).trim();
              if (newPath === "..") {
                setCurrentPath(prev => {
                  const parts = prev.split("/");
                  parts.pop();
                  return parts.join("/") || "/";
                });
              } else if (newPath.startsWith("/")) {
                setCurrentPath(newPath);
              } else {
                setCurrentPath(prev => `${prev}/${newPath}`);
              }
            }
          } catch (error) {
            terminalInstance.writeln(`❌ Errore: ${error}`);
          }
        }
        
        currentCommand = "";
        showPrompt(terminalInstance);
      } else if (code === 127) { // Backspace
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          terminalInstance.write("\b \b");
        }
      } else if (code >= 32) { // Caratteri stampabili
        currentCommand += data;
        terminalInstance.write(data);
      }
    });

    // Cleanup
    return () => {
      terminalInstance.dispose();
    };
  }, [selectedServer, sshSessionId, term, showPrompt]); // Aggiunto showPrompt alle dipendenze

  // Ridimensiona il terminale quando la finestra cambia
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon && term) {
        setTimeout(() => fitAddon.fit(), 100);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitAddon, term]);

  // Rimuoviamo la funzione showPrompt da qui perché è stata spostata sopra

  const handleClose = () => {
    if (term) {
      term.dispose();
      setTerm(null);
    }
    toggleTerminal();
  };

  const handleMinimize = () => {
    // Per ora solo chiudiamo, in futuro possiamo implementare minimize
    handleClose();
  };

  if (!selectedServer || !sshSessionId) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-50">
      {/* Header del terminale */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4">
            Terminal - {selectedServer.name} ({selectedServer.ip})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-700 rounded"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminale */}
      <div 
        ref={terminalRef} 
        className="h-80 p-2"
        style={{ 
          background: "#0a0a0a",
          fontFamily: '"Cascadia Code", "Fira Code", "Monaco", monospace'
        }}
      />
    </div>
  );
};

export default TerminalComponent;