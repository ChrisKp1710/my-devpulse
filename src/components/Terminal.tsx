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
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [realUsername, setRealUsername] = useState<string | null>(null);
  const [realHostname, setRealHostname] = useState<string | null>(null);
  const { selectedServer, sshSessionId, toggleTerminal } = useServer();

  // Funzione per inizializzare il terminale REALE e INTERATTIVO
  const initializeTerminal = useCallback(async () => {
    if (!selectedServer || !sshSessionId || !terminalRef.current || term) {
      return;
    }

    console.log("🖥️ Inizializzazione terminale INTERATTIVO per:", selectedServer.name);

    try {
      // Crea il terminale con configurazione per PTY reale
      const terminalInstance = new Terminal({
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        disableStdin: false,
        allowProposedApi: true, // Per funzionalità avanzate
        theme: {
          background: "#0C0C0C", // Windows Terminal style
          foreground: "#CCCCCC",
          cursor: "#FFFFFF",
          cursorAccent: "#000000",
          selectionBackground: "#3b82f6",
          black: "#0C0C0C",
          red: "#C50F1F",
          green: "#13A10E",
          yellow: "#C19C00",
          blue: "#0037DA",
          magenta: "#881798",
          cyan: "#3A96DD",
          white: "#CCCCCC",
          brightBlack: "#767676",
          brightRed: "#E74856",
          brightGreen: "#16C60C",
          brightYellow: "#F9F1A5",
          brightBlue: "#3B78FF",
          brightMagenta: "#B4009E",
          brightCyan: "#61D6D6",
          brightWhite: "#F2F2F2"
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
      await new Promise(resolve => setTimeout(resolve, 300));

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
            setTimeout(attemptFit, 100 * fitAttempts);
          } else {
            console.warn("⚠️ Fit fallito dopo", maxFitAttempts, "tentativi. Continuo senza fit.");
            setIsTerminalReady(true);
          }
        }
      };

      attemptFit();

      setTerm(terminalInstance);
      setFitAddon(fitAddonInstance);

      // ✅ AVVIA SHELL INTERATTIVA REALE
      try {
        console.log("🚀 Avvio shell interattiva...");
        
        // Avvia una shell interattiva con PTY
        await invoke("start_interactive_shell", {
          sessionId: sshSessionId,
          terminalCols: terminalInstance.cols,
          terminalRows: terminalInstance.rows
        });

        console.log("✅ Shell interattiva avviata");

        // Recupera informazioni server in background
        try {
          const whoamiResult = await invoke<string>("execute_ssh_command", {
            sessionId: sshSessionId,
            command: "whoami"
          });
          setRealUsername(whoamiResult.trim());

          const hostnameResult = await invoke<string>("execute_ssh_command", {
            sessionId: sshSessionId,
            command: "hostname"
          });
          setRealHostname(hostnameResult.trim());
        } catch (error) {
          console.warn("⚠️ Errore recupero info server:", error);
        }

        // ✅ GESTIONE INPUT/OUTPUT REALE
        terminalInstance.onData(async (data) => {
          try {
            // Invia DIRETTAMENTE tutti i dati alla shell remota
            await invoke("send_to_shell", {
              sessionId: sshSessionId,
              data: data
            });
          } catch (error) {
            console.error("❌ Errore invio dati:", error);
          }
        });

        // ✅ POLLING OUTPUT DALLA SHELL
        const pollShellOutput = async () => {
          try {
            const output = await invoke<string>("read_shell_output", {
              sessionId: sshSessionId
            });
            
            if (output && output.length > 0) {
              terminalInstance.write(output);
            }
          } catch {
            // Silenzioso - può essere normale se non c'è output
          }
        };

        // Polling ogni 50ms per output fluido
        const outputInterval = setInterval(pollShellOutput, 50);

        // Cleanup function
        return () => {
          console.log("🧹 Pulizia terminale");
          clearInterval(outputInterval);
          try {
            terminalInstance.dispose();
          } catch (error) {
            console.warn("⚠️ Errore durante dispose:", error);
          }
        };

      } catch (error) {
        console.error("❌ Errore avvio shell interattiva:", error);
        terminalInstance.writeln("\r\n❌ Errore: Impossibile avviare shell interattiva");
        terminalInstance.writeln("Controlla la connessione SSH e riprova.");
      }

    } catch (error) {
      console.error("❌ Errore critico inizializzazione terminale:", error);
    }
  }, [selectedServer, sshSessionId, term]);

  // Effect per inizializzare il terminale
  useEffect(() => {
    if (selectedServer && sshSessionId && terminalRef.current && !term) {
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
            // Notifica resize al server
            if (sshSessionId) {
              invoke("resize_shell", {
                sessionId: sshSessionId,
                cols: term.cols,
                rows: term.rows
              }).catch(console.warn);
            }
          }, 50);
        } catch (error) {
          console.warn("⚠️ Errore durante resize:", error);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitAddon, term, isTerminalReady, sshSessionId]);

  const handleClose = async () => {
    if (term) {
      try {
        // Chiudi la shell interattiva
        if (sshSessionId) {
          await invoke("stop_interactive_shell", { sessionId: sshSessionId });
        }
        term.dispose();
      } catch (error) {
        console.warn("⚠️ Errore chiusura terminale:", error);
      }
      setTerm(null);
    }
    setIsTerminalReady(false);
    setRealHostname(null);
    setRealUsername(null);
    toggleTerminal();
  };

  const handleMinimize = () => {
    handleClose();
  };

  if (!selectedServer || !sshSessionId) {
    return null;
  }

  // Display info for title
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
            Terminal - {displayUsername}@{displayHostname} ({selectedServer.ip})
          </span>
          {isTerminalReady && (
            <span className="ml-2 text-green-400 text-xs">● SHELL INTERATTIVA</span>
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
            background: "#0C0C0C",
            fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace'
          }}
        />
        
        {!isTerminalReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Avvio shell interattiva...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalComponent;