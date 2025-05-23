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
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const { selectedServer, sshSessionId, toggleTerminal } = useServer();

  // Stato per salvare il vero hostname del server
  const [realHostname, setRealHostname] = useState<string | null>(null);
  const [realUsername, setRealUsername] = useState<string | null>(null);

  // Funzione per mostrare il prompt
  const showPrompt = useCallback((terminal: Terminal) => {
    const user = realUsername || selectedServer?.sshUser || "user";
    const host = realHostname || selectedServer?.name || "server";
    terminal.write(`\r\n\x1b[32m${user}@${host}\x1b[0m:\x1b[34m${currentPath}\x1b[0m$ `);
  }, [selectedServer?.sshUser, selectedServer?.name, currentPath, realHostname, realUsername]);

  // Funzione per inizializzare il terminale in modo sicuro
  const initializeTerminal = useCallback(async () => {
    if (!selectedServer || !sshSessionId || !terminalRef.current || term) {
      return;
    }

    console.log("🖥️ Inizializzazione terminale sicura per:", selectedServer.name);

    try {
      // Crea il terminale con configurazione più conservativa
      const terminalInstance = new Terminal({
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        disableStdin: false,
        theme: {
          background: "#1a1a1a",
          foreground: "#ffffff",
          cursor: "#ffffff",
          cursorAccent: "#000000",
          selectionBackground: "#3b82f6",
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
        rows: 30,
        cols: 120,
      });

      // Addon per il fit
      const fitAddonInstance = new FitAddon();
      terminalInstance.loadAddon(fitAddonInstance);

      console.log("🔧 Apertura terminale...");
      
      // Apri il terminale nel DOM
      terminalInstance.open(terminalRef.current);

      // Aspetta che il terminale sia completamente renderizzato
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log("📐 Tentativo fit terminale...");
      
      // Try-catch per il fit con retry
      let fitAttempts = 0;
      const maxFitAttempts = 5;
      
      const attemptFit = () => {
        try {
          fitAddonInstance.fit();
          console.log("✅ Terminale dimensionato correttamente");
          setIsTerminalReady(true);
        } catch (error) {
          fitAttempts++;
          console.warn(`⚠️ Tentativo fit ${fitAttempts} fallito:`, error);
          
          if (fitAttempts < maxFitAttempts) {
            setTimeout(attemptFit, 100 * fitAttempts); // Backoff incrementale
          } else {
            console.warn("⚠️ Fit fallito dopo", maxFitAttempts, "tentativi. Continuo senza fit.");
            setIsTerminalReady(true);
          }
        }
      };

      attemptFit();

      setTerm(terminalInstance);
      setFitAddon(fitAddonInstance);

      // Messaggio di benvenuto
      terminalInstance.writeln("\r\n🔗 Connessione SSH REALE stabilita!");
      terminalInstance.writeln(`📡 Server: ${selectedServer.name} (${selectedServer.ip})`);
      terminalInstance.writeln(`🔑 Sessione: ${sshSessionId}`);
      terminalInstance.writeln("\r\n🚀 Terminale pronto per i comandi SSH!");

      // ✅ Test di connessione e recupero info server REALI
      try {
        // 👤 Recupera l'utente reale connesso
        const whoamiResult = await invoke<string>("execute_ssh_command", {
          sessionId: sshSessionId,
          command: "whoami"
        });
        const actualUsername = whoamiResult.trim();
        terminalInstance.writeln(`👤 Utente connesso: ${actualUsername}`);
        setRealUsername(actualUsername); // ✅ Salva l'utente reale

        // 🏠 Recupera il vero hostname del server
        const hostnameResult = await invoke<string>("execute_ssh_command", {
          sessionId: sshSessionId,
          command: "hostname"
        });
        const serverHostname = hostnameResult.trim();
        
        // ✅ Aggiorna il nome del server per il prompt E il titolo
        if (serverHostname && serverHostname !== selectedServer.name) {
          terminalInstance.writeln(`🏠 Hostname server: ${serverHostname}`);
          setRealHostname(serverHostname); // ✅ Salva il vero hostname
        }

        // ✅ Configura alias utili (come ll)
        try {
          await invoke<string>("execute_ssh_command", {
            sessionId: sshSessionId,
            command: "alias ll='ls -la'"
          });
          terminalInstance.writeln(`🔧 Alias configurati: ll='ls -la'`);
        } catch (error) {
          console.warn("⚠️ Errore configurazione alias:", error);
        }
      } catch (error) {
        console.warn("⚠️ Test connessione fallito:", error);
      }

      showPrompt(terminalInstance);

      let currentCommand = "";

      // Gestione input migliorata
      const handleData = async (data: string) => {
        const code = data.charCodeAt(0);

        if (code === 13) { // Enter
          terminalInstance.write("\r\n");
          
          if (currentCommand.trim()) {
            const command = currentCommand.trim();
            terminalInstance.writeln(`> Esecuzione: ${command}`);
            
            try {
              const result = await invoke<string>("execute_ssh_command", {
                sessionId: sshSessionId,
                command: command
              });
              
              if (result.trim()) {
                terminalInstance.writeln(result);
              }
              
              // Gestione cambio directory
              if (command.startsWith("cd ")) {
                try {
                  const pwdResult = await invoke<string>("execute_ssh_command", {
                    sessionId: sshSessionId,
                    command: "pwd"
                  });
                  setCurrentPath(pwdResult.trim());
                } catch (error) {
                  console.warn("⚠️ Errore aggiornamento path:", error);
                }
              }
            } catch (error) {
              terminalInstance.writeln(`\x1b[31m❌ Errore: ${error}\x1b[0m`);
            }
          }
          
          currentCommand = "";
          showPrompt(terminalInstance);
        } else if (code === 127) { // Backspace
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.slice(0, -1);
            terminalInstance.write("\b \b");
          }
        } else if (code === 3) { // Ctrl+C
          terminalInstance.writeln("\r\n^C");
          currentCommand = "";
          showPrompt(terminalInstance);
        } else if (code >= 32) { // Caratteri stampabili
          currentCommand += data;
          terminalInstance.write(data);
        }
      };

      terminalInstance.onData(handleData);

      // Cleanup function
      return () => {
        console.log("🧹 Pulizia terminale");
        try {
          terminalInstance.dispose();
        } catch (error) {
          console.warn("⚠️ Errore durante dispose:", error);
        }
      };

    } catch (error) {
      console.error("❌ Errore critico inizializzazione terminale:", error);
    }
  }, [selectedServer, sshSessionId, term, showPrompt]);

  // Effect per inizializzare il terminale
  useEffect(() => {
    if (selectedServer && sshSessionId && terminalRef.current && !term) {
      // Delay per assicurarsi che il DOM sia pronto
      const timer = setTimeout(() => {
        initializeTerminal();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedServer, sshSessionId, term, initializeTerminal]);

  // Gestione resize con protezione
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon && term && isTerminalReady) {
        try {
          setTimeout(() => {
            fitAddon.fit();
          }, 50);
        } catch (error) {
          console.warn("⚠️ Errore durante resize:", error);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitAddon, term, isTerminalReady]);

  const handleClose = async () => {
    if (term) {
      try {
        term.dispose();
      } catch (error) {
        console.warn("⚠️ Errore chiusura terminale:", error);
      }
      setTerm(null);
    }
    setIsTerminalReady(false);
    setRealHostname(null); // ✅ Reset hostname quando chiudiamo
    setRealUsername(null); // ✅ Reset username quando chiudiamo
    toggleTerminal();
  };

  const handleMinimize = () => {
    handleClose();
  };

  if (!selectedServer || !sshSessionId) {
    return null;
  }

  // ✅ Usa i valori reali se disponibili per il titolo
  const displayUsername = realUsername || selectedServer.sshUser;
  const displayHostname = realHostname || selectedServer.name;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 z-50 shadow-2xl">
      {/* Header del terminale */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-white text-sm border-b border-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4 font-mono">
            {/* ✅ Usa hostname e username REALI nel titolo */}
            Terminal - {displayUsername}@{displayHostname} ({selectedServer.ip})
          </span>
          {isTerminalReady && (
            <span className="ml-2 text-green-400 text-xs">● CONNESSO</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Container terminale */}
      <div className="relative">
        <div 
          ref={terminalRef} 
          className="h-96 p-3"
          style={{ 
            background: "#1a1a1a",
            fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace'
          }}
        />
        
        {!isTerminalReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Inizializzazione terminale...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalComponent;