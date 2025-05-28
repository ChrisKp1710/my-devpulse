import React, { useState, useEffect } from 'react';
import { useServer } from '../context/useServer';
import {
  Power,
  Play,
  Terminal,
  Settings,
  StopCircle,
  Trash,
  Wifi,
  WifiOff,
  Clock,
  Zap, // ✅ AGGIUNTO per Wake-on-LAN
  Edit, // ✅ AGGIUNTO per modifica
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { useTerminalDrawerStore } from '@/store/useTerminalDrawerStore';
import EditServerModal from './EditServerModal'; // ✅ Modal completo
import ConfigureWakeOnLANModal from './ConfigureWakeOnLANModal'; // ✅ Modal WoL

interface TerminalStatus {
  is_connected: boolean;
  message: string;
}

// ✅ AGGIUNTO: Interfaccia per risultati gestione energia
interface PowerResult {
  success: boolean;
  message: string;
  details?: string;
}

const ServerSidebar: React.FC = () => {
  const { selectedServer, toggleServerStatus, removeServer, serverStatuses } = useServer();
  const [isConnecting, setIsConnecting] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>({ 
    is_connected: false, 
    message: "" 
  });
  
  // ✅ AGGIUNTO: Stati per gestione energia
  const [isWaking, setIsWaking] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  
  // ✅ AGGIUNTO: Modal separati
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWoLModal, setShowWoLModal] = useState(false);
  
  const { open, connect, setConnected } = useTerminalDrawerStore();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke<TerminalStatus>('check_terminal_status');
        setTerminalStatus(status);
        setConnected(status.is_connected);
      } catch (error) {
        console.error('❌ Errore controllo stato terminale:', error);
        setConnected(false);
      }
    };
    
    checkStatus();
  }, [selectedServer, setConnected]);

  if (!selectedServer) return null;

  const serverStatus = serverStatuses[selectedServer.id];
  const isReallyOnline = serverStatus?.isOnline || false;
  const lastChecked = serverStatus?.lastChecked;
  const responseTime = serverStatus?.responseTime;

  const handleStatusToggle = () => {
    toggleServerStatus(selectedServer.id);
  };

  // ✅ AGGIUNTO: Wake-on-LAN - Accendi server
  const handleWakeOnLAN = async () => {
    if (!selectedServer.macAddress) {
      // ✅ Apri modal specifico per configurare WoL
      setShowWoLModal(true);
      return;
    }

    setIsWaking(true);
    try {
      console.log("🔌 Invio Wake-on-LAN a:", selectedServer.macAddress);
      
      const result = await invoke<PowerResult>('wake_server', {
        macAddress: selectedServer.macAddress,
        broadcastIp: null, // Usa broadcast automatico
      });

      if (result.success) {
        toast.success("✅ " + result.message, {
          description: result.details || "Il server dovrebbe accendersi in 10-60 secondi",
        });
        console.log("✅ Wake-on-LAN inviato con successo");
      } else {
        toast.error("❌ " + result.message, {
          description: result.details,
        });
      }
    } catch (error) {
      console.error("❌ Errore Wake-on-LAN:", error);
      toast.error("❌ Errore durante Wake-on-LAN", {
        description: String(error),
      });
    } finally {
      setIsWaking(false);
    }
  };

  // ✅ AGGIUNTO: Shutdown server - Spegni server
  const handleShutdownServer = async () => {
    if (!isReallyOnline) {
      toast.error("❌ Server offline", {
        description: "Il server deve essere online per essere spento via SSH"
      });
      return;
    }

    const confirmed = window.confirm(
      `Sei sicuro di voler spegnere il server "${selectedServer.name}"?\n\n` +
      `Questo comando spegnerà fisicamente il server tramite SSH.`
    );
    
    if (!confirmed) return;

    setIsShuttingDown(true);
    try {
      console.log("🛑 Spegnimento server:", selectedServer.name);
      
      const result = await invoke<PowerResult>('shutdown_server', {
        ip: selectedServer.ip,
        sshUser: selectedServer.sshUser,
        sshPort: selectedServer.sshPort,
        password: selectedServer.password || null,
        customCommand: selectedServer.shutdownCommand || null,
      });

      if (result.success) {
        toast.success("✅ " + result.message, {
          description: result.details || "Il server si sta spegnendo...",
        });
        console.log("✅ Comando spegnimento inviato con successo");
      } else {
        toast.warning("⚠️ " + result.message, {
          description: result.details,
        });
      }
    } catch (error) {
      console.error("❌ Errore spegnimento:", error);
      toast.error("❌ Errore durante lo spegnimento", {
        description: String(error),
      });
    } finally {
      setIsShuttingDown(false);
    }
  };

  // ✅ ESISTENTE: Logica terminal (invariata)
  const waitForTerminalReady = async (maxAttempts = 15): Promise<boolean> => {
    console.log("⏳ Verificando disponibilità ttyd...");
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        await fetch('http://localhost:7681', { 
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ Tentativo ${attempt}: ttyd disponibile`);
        
        if (attempt <= 3) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return true;
      } catch {
        console.log(`⏳ Tentativo ${attempt}/${maxAttempts}: ttyd non disponibile`);
        
        if (attempt < maxAttempts) {
          const waitTime = Math.min(attempt * 200, 1000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    console.warn("⚠️ ttyd non disponibile, procedo comunque");
    return false;
  };

  const handleOpenTerminal = async () => {
    if (!selectedServer) return;

    if (terminalStatus.is_connected) {
      open();
      toast.success("📺 Terminale riaperto");
      console.log("🔄 Drawer riaperto - connessione già attiva");
      return;
    }

    setIsConnecting(true);
    
    try {
      console.log("🔌 Avvio nuova connessione SSH...");
      
      toast.loading("🔌 Connessione SSH in corso...", { 
        id: "ssh-connection",
        duration: Infinity 
      });

      const result = await invoke<TerminalStatus>('open_terminal', {
        request: {
          sshUser: selectedServer.sshUser,
          ip: selectedServer.ip,
          sshPort: selectedServer.sshPort,
          password: selectedServer.password ?? null,
        },
      });

      console.log("🚀 SSH avviato:", result.message);
      setTerminalStatus(result);
      setConnected(result.is_connected);

      toast.loading("📺 Preparazione interfaccia terminale...", { 
        id: "ssh-connection"
      });

      const isReady = await waitForTerminalReady(15);
      
      sessionStorage.setItem('terminal-reconnecting', 'true');
      connect();
      
      if (isReady) {
        toast.success("✅ " + result.message, { id: "ssh-connection" });
        console.log("🎉 Terminale pronto");
      } else {
        toast.success("✅ SSH connesso - terminale in caricamento", { 
          id: "ssh-connection",
          description: "L'interfaccia potrebbe impiegare qualche secondo extra"
        });
        console.log("⚠️ SSH OK, ttyd in caricamento");
      }
    } catch (error) {
      console.error('❌ Errore apertura terminale:', error);
      toast.error('❌ Errore connessione SSH', { 
        id: "ssh-connection",
        description: String(error) 
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await removeServer(selectedServer.id);
      toast.success(`🗑️ Server "${selectedServer.name}" eliminato`);
    } catch (error) {
      toast.error(`❌ Errore eliminazione server: ${error}`);
    }
  };

  const formatLastChecked = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return `${seconds}s fa`;
    if (minutes < 60) return `${minutes}m fa`;
    return `${Math.floor(minutes / 60)}h fa`;
  };

  return (
    <div className="w-full bg-card shadow-xl border border-border rounded-2xl p-4 mt-20">
      <h3 className="text-lg font-medium mb-4">{selectedServer.name}</h3>

      <div className="text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span>Status:</span>
          <div className="flex items-center gap-2">
            {isReallyOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-500 font-medium">offline</span>
              </>
            )}
          </div>
        </div>

        {terminalStatus.is_connected && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Terminal className="h-3 w-3 text-blue-500" />
            <span className="text-blue-500">SSH connesso</span>
          </div>
        )}

        {serverStatus && lastChecked && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Clock className="h-3 w-3" />
            <span>Ultimo check: {formatLastChecked(lastChecked)}</span>
            {responseTime && <span className="text-green-600">({responseTime}ms)</span>}
          </div>
        )}

        <div>IP: <span className="text-foreground">{selectedServer.ip}</span></div>
        <div>Type: <span className="text-foreground">{selectedServer.type}</span></div>
        <div>User: <span className="text-foreground">{selectedServer.sshUser}</span></div>
        <div>Port: <span className="text-foreground">{selectedServer.sshPort}</span></div>
        
        {/* ✅ AGGIUNTO: Mostra MAC address se presente */}
        {selectedServer.macAddress && (
          <div>MAC: <span className="text-foreground">{selectedServer.macAddress}</span></div>
        )}
      </div>

      <div className="border-t border-border my-2" />
      <h4 className="text-sm font-medium mb-2">Power Management</h4>

      {/* ✅ AGGIUNTO: Wake-on-LAN Button */}
      <button 
        className={`sidebar-command ${
          isWaking 
            ? 'opacity-50 cursor-not-allowed' 
            : !selectedServer.macAddress
              ? 'opacity-75 hover:bg-yellow-50 hover:text-yellow-700 dark:hover:bg-yellow-900/20'
              : 'hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20'
        }`}
        onClick={selectedServer.macAddress ? handleWakeOnLAN : () => setShowWoLModal(true)}
        disabled={isWaking}
        title={!selectedServer.macAddress ? 'Clicca per configurare Wake-on-LAN' : 'Accendi server via Wake-on-LAN'}
      >
        <Zap className={`h-4 w-4 ${isWaking ? 'animate-pulse text-green-500' : !selectedServer.macAddress ? 'text-yellow-500' : ''}`} />
        <span>
          {isWaking 
            ? 'Accendendo...' 
            : !selectedServer.macAddress 
              ? 'Wake On LAN (Configura)' 
              : 'Wake On LAN'
          }
        </span>
      </button>

      {/* ✅ MODIFICATO: Shutdown con funzionalità reale */}
      <button 
        className={`sidebar-command ${
          !isReallyOnline || isShuttingDown 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20'
        }`}
        onClick={handleShutdownServer}
        disabled={!isReallyOnline || isShuttingDown}
        title={!isReallyOnline ? 'Server offline - impossibile spegnere' : 'Spegni server via SSH'}
      >
        <Power className={`h-4 w-4 ${isShuttingDown ? 'animate-pulse text-red-500' : ''}`} />
        <span>{isShuttingDown ? 'Spegnendo...' : 'Shutdown Server'}</span>
      </button>

      <div className="border-t border-border my-2" />
      <h4 className="text-sm font-medium mb-2">Actions</h4>

      {/* ✅ ESISTENTE: Toggle status locale */}
      <button className="sidebar-command" onClick={handleStatusToggle}>
        {selectedServer.status === 'online' ? (
          <>
            <StopCircle className="h-4 w-4" />
            <span>Mark Offline</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span>Mark Online</span>
          </>
        )}
      </button>

      {/* ✅ ESISTENTE: Terminal button */}
      <button
        className={`sidebar-command mt-4 ${
          isReallyOnline
            ? terminalStatus.is_connected
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
        onClick={handleOpenTerminal}
        disabled={isConnecting || !isReallyOnline}
        title={!isReallyOnline ? 'Server offline - impossibile connettersi' : ''}
      >
        <Terminal className="h-4 w-4" />
        <span>
          {isConnecting
            ? 'Connessione...'
            : !isReallyOnline
              ? 'Terminal (Offline)'
              : terminalStatus.is_connected
                ? 'Riapri Terminal'
                : 'Open Terminal'}
        </span>
      </button>

      <button 
        className="sidebar-command mt-4"
        onClick={() => setShowEditModal(true)}
      >
        <Edit className="h-4 w-4" />
        <span>Edit Server</span>
      </button>

      <button className="sidebar-command">
        <Settings className="h-4 w-4" />
        <span>Advanced Settings</span>
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full mt-6 flex justify-center items-center gap-2">
            <Trash size={16} />
            Elimina Server
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare il server?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare <strong>{selectedServer.name}</strong>?<br />
            L'azione non può essere annullata.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline">Annulla</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ AGGIUNTO: Modal completo di modifica server */}
      <EditServerModal
        server={selectedServer}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* ✅ AGGIUNTO: Modal specifico per configurare Wake-on-LAN */}
      <ConfigureWakeOnLANModal
        server={selectedServer}
        isOpen={showWoLModal}
        onClose={() => setShowWoLModal(false)}
      />
    </div>
  );
};

export default ServerSidebar;