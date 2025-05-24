// src/components/Terminal.tsx - VERSIONE COMPLETA E PERFETTA
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
  const [canType, setCanType] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const { selectedServer, sshSessionId, toggleTerminal } = useServer();

  // Funzione per testare la connessione SSH
  const testConnection = useCallback(async () => {
    if (!sshSessionId) return false;
    
    try {
      console.log("🧪 Test connessione SSH...");
      const testResult = await invoke<string>("execute_ssh_command", {
        sessionId: sshSessionId,
        command: "echo 'DevPulse_Connection_Test_OK'"
      });
      console.log("✅ Test connessione risultato:", testResult);
      return testResult.includes("DevPulse_Connection_Test_OK");
    } catch (error) {
      console.error("❌ Test connessione fallito:", error);
      return false;
    }
  }, [sshSessionId]);

  // Funzione per inizializzare il terminale REALE e INTERATTIVO
  const initializeTerminal = useCallback(async () => {
    if (!selectedServer || !sshSessionId || !terminalRef.current || term) {
      return;
    }

    console.log("🖥️ Inizializzazione terminale INTERATTIVO per:", selectedServer.name);
    console.log("🔍 Session ID:", sshSessionId);

    try {
      // ✅ CONFIGURAZIONE TERMINALE OTTIMALE
      const terminalInstance = new Terminal({
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        disableStdin: false, // ✅ IMPORTANTE: Abilita input
        allowProposedApi: true,
        allowTransparency: false,
        macOptionIsMeta: true,
        rightClickSelectsWord: false,
        theme: {
          background: "#0C0C0C",
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

      // ✅ FOCUS IMMEDIATO SUL TERMINALE
      terminalInstance.focus();

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
        setConnectionStatus('connecting');
        
        // Avvia una shell interattiva con PTY
        await invoke("start_interactive_shell", {
          sessionId: sshSessionId,
          terminalCols: terminalInstance.cols,
          terminalRows: terminalInstance.rows
        });

        console.log("✅ Shell interattiva avviata");

        // ✅ TEST CONNESSIONE INIZIALE
        const isConnected = await testConnection();
        if (!isConnected) {
          throw new Error("Test connessione fallito");
        }

        setConnectionStatus('connected');

        // ✅ MESSAGGIO DI BENVENUTO
        terminalInstance.writeln("\r\n🔗 DevPulse Terminal - Connesso!");
        terminalInstance.writeln("Digitare comandi SSH...\r\n");

        // ✅ ABILITA INPUT
        setCanType(true);

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

        // ✅ GESTIONE INPUT CON DEBUG COMPLETO
        terminalInstance.onData(async (data) => {
          try {
            console.log("🔤 Input ricevuto:", JSON.stringify(data));
            
            // ✅ Verifica che la sessione esista ancora
            if (!sshSessionId) {
              console.error("❌ SSH Session ID mancante!");
              terminalInstance.writeln("\r\n❌ Errore: Sessione SSH non trovata");
              setConnectionStatus('error');
              return;
            }
            
            console.log("📡 Tentativo invio a sessione:", sshSessionId);
            
            // Invia DIRETTAMENTE tutti i dati alla shell remota
            await invoke("send_to_shell", {
              sessionId: sshSessionId,
              data: data
            });
            
            console.log("📤 Dati inviati al server con successo");
            
          } catch (error) {
            console.error("❌ Errore invio dati completo:", error);
            console.error("❌ Tipo errore:", typeof error);
            console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'Nessuno stack');
            
            setConnectionStatus('error');
            terminalInstance.writeln(`\r\n❌ Errore connessione: ${error}`);
            terminalInstance.writeln("🔄 Prova a riconnetterti...");
          }
        });

        // ✅ GESTIONE EVENTI TASTIERA AGGIUNTIVI
        terminalInstance.onKey((event) => {
          console.log("🔑 Key event:", event.key, "DOM:", event.domEvent.key);
        });

        // ✅ POLLING OUTPUT DALLA SHELL CON DEBUG MIGLIORATO
        const pollShellOutput = async () => {
          try {
            if (!sshSessionId) {
              console.warn("⚠️ SSH Session ID mancante per polling");
              return;
            }
            
            const output = await invoke<string>("read_shell_output", {
              sessionId: sshSessionId
            });
            
            if (output && output.length > 0) {
              console.log("📥 Output ricevuto:", output.length, "caratteri");
              console.log("📥 Primi 50 caratteri:", JSON.stringify(output.substring(0, 50)));
              terminalInstance.write(output);
            }
          } catch (error) {
            // Silenzioso per evitare spam - ma logga errori gravi
            if (error !== "Shell interattiva non trovata" && 
                !String(error).includes("Shell interattiva non trovata")) {
              console.warn("⚠️ Errore polling:", error);
              
              // Se errore grave, cambia status
              if (String(error).includes("Session") || String(error).includes("connection")) {
                setConnectionStatus('error');
              }
            }
          }
        };

        // Polling ogni 100ms per output fluido
        const outputInterval = setInterval(pollShellOutput, 100);

        // ✅ FOCUS QUANDO L'UTENTE CLICCA
        terminalInstance.element?.addEventListener('click', () => {
          terminalInstance.focus();
          console.log("🎯 Terminale rifocalizzato");
        });

        // ✅ TEST CONNESSIONE PERIODICO
        const connectionTestInterval = setInterval(async () => {
          const isStillConnected = await testConnection();
          if (!isStillConnected) {
            setConnectionStatus('error');
            terminalInstance.writeln("\r\n❌ Connessione SSH persa!");
          }
        }, 30000); // Ogni 30 secondi

        // Cleanup function
        return () => {
          console.log("🧹 Pulizia terminale");
          clearInterval(outputInterval);
          clearInterval(connectionTestInterval);
          try {
            terminalInstance.dispose();
          } catch (error) {
            console.warn("⚠️ Errore durante dispose:", error);
          }
        };

      } catch (error) {
        console.error("❌ Errore avvio shell interattiva:", error);
        setConnectionStatus('error');
        terminalInstance.writeln("\r\n❌ Errore: Impossibile avviare shell interattiva");
        terminalInstance.writeln("Controlla la connessione SSH e riprova.");
        terminalInstance.writeln(`Dettaglio errore: ${error}`);
        
        // ✅ BOTTONE PER RIPROVA
        terminalInstance.writeln("\r\n🔄 Chiudi e riapri il terminale per riprovare.");
      }

    } catch (error) {
      console.error("❌ Errore critico inizializzazione terminale:", error);
      setConnectionStatus('error');
    }
  }, [selectedServer, sshSessionId, term, testConnection]);

  // Effect per inizializzare il terminale
  useEffect(() => {
    if (selectedServer && sshSessionId && terminalRef.current && !term) {
      const timer = setTimeout(() => {
        initializeTerminal();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedServer, sshSessionId, term, initializeTerminal]);

  // ✅ GESTIONE FOCUS QUANDO IL TERMINALE DIVENTA VISIBILE
  useEffect(() => {
    if (term && isTerminalReady) {
      const timer = setTimeout(() => {
        term.focus();
        console.log("🎯 Auto-focus sul terminale");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [term, isTerminalReady]);

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
    setCanType(false);
    setConnectionStatus('connecting');
    setRealHostname(null);
    setRealUsername(null);
    toggleTerminal();
  };

  const handleMinimize = () => {
    handleClose();
  };

  // ✅ FUNZIONE DI TEST MANUALE
  const testInputManually = async () => {
    if (term && sshSessionId) {
      term.focus();
      console.log("🧪 Test input manuale - terminale focalizzato");
      
      try {
        // Test diretto
        await invoke("send_to_shell", {
          sessionId: sshSessionId,
          data: "echo 'Test manuale'\r"
        });
        console.log("✅ Test manuale inviato");
      } catch (error) {
        console.error("❌ Test manuale fallito:", error);
      }
    }
  };

  // ✅ FUNZIONE PER RICONNESSIONE
  const handleReconnect = async () => {
    if (term) {
      term.clear();
      term.writeln("🔄 Riconnessione in corso...");
      setConnectionStatus('connecting');
      
      try {
        // Riavvia shell
        await invoke("start_interactive_shell", {
          sessionId: sshSessionId,
          terminalCols: term.cols,
          terminalRows: term.rows
        });
        
        const isConnected = await testConnection();
        if (isConnected) {
          setConnectionStatus('connected');
          term.writeln("✅ Riconnesso con successo!");
        } else {
          setConnectionStatus('error');
          term.writeln("❌ Riconnessione fallita");
        }
      } catch (error) {
        setConnectionStatus('error');
        term.writeln(`❌ Errore riconnessione: ${error}`);
      }
    }
  };

  if (!selectedServer || !sshSessionId) {
    return null;
  }

  // Display info for title
  const displayUsername = realUsername || selectedServer.sshUser;
  const displayHostname = realHostname || selectedServer.name;

  // ✅ INDICATORI STATUS MIGLIORATI
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '● CONNESSO';
      case 'connecting': return '⚪ CONNESSIONE...';
      case 'error': return '● ERRORE';
      default: return '● SCONOSCIUTO';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 z-50 shadow-2xl">
      {/* Header del terminale */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-white text-sm border-b border-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4 font-mono">
            DevPulse Terminal - {displayUsername}@{displayHostname} ({selectedServer.ip})
          </span>
          
          {/* ✅ INDICATORI STATUS MIGLIORATI */}
          <span className={`ml-2 text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          
          {canType && (
            <span className="ml-2 text-blue-400 text-xs">✏️ INPUT ATTIVO</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* ✅ BOTTONI CONTROLLO */}
          <button
            onClick={testInputManually}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
            title="Test Input Manuale"
          >
            Test
          </button>
          
          {connectionStatus === 'error' && (
            <button
              onClick={handleReconnect}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
              title="Riconnetti"
            >
              Riconnetti
            </button>
          )}
          
          <button
            onClick={() => term?.focus()}
            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
            title="Focus Terminal"
          >
            Focus
          </button>
          
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
          onClick={() => term?.focus()} // ✅ FOCUS AL CLICK
        />
        
        {/* ✅ OVERLAY STATUS MIGLIORATO */}
        {(!isTerminalReady || connectionStatus === 'connecting') && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>{connectionStatus === 'connecting' ? 'Connessione in corso...' : 'Inizializzazione terminale...'}</p>
              <p className="text-xs text-gray-400 mt-2">
                {selectedServer.name} ({selectedServer.ip}:{selectedServer.sshPort})
              </p>
            </div>
          </div>
        )}
        
        {connectionStatus === 'error' && isTerminalReady && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-xs">
            ⚠️ Errore Connessione
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalComponent;