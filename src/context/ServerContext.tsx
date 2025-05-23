// src/context/ServerContext.tsx - VERSIONE AGGIORNATA
import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Server, ServerStatus } from './ServerContext.types';
import { loadServers } from "@/lib/serverStorage";
import { invoke } from "@tauri-apps/api/core";
import { deleteServerById } from "@/lib/serverStorage";
import { useServerMonitoring } from '@/hooks/useServerMonitoring';

interface ServerContextType {
  servers: Server[];
  selectedServer: Server | null;
  terminalVisible: boolean;
  sshSessionId: string | null;
  serverStatuses: Record<string, { isOnline: boolean; lastChecked: number; responseTime?: number }>;
  isMonitoring: boolean;
  setServers: (servers: Server[]) => void;
  setSelectedServer: (server: Server | null) => void;
  toggleTerminal: () => void;
  toggleServerStatus: (id: string) => void;
  startSshConnection: (server: Server) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  refreshServerStatuses: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ServerContext = createContext<ServerContextType | undefined>(
  undefined
);

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sshSessionId, setSshSessionId] = useState<string | null>(null);

  // ✅ Usa il hook di monitoring
  const { serverStatuses, isMonitoring, refreshServerStatuses, getServerStatus } = useServerMonitoring(servers);

  useEffect(() => {
    console.log("🔁 Caricamento server da Tauri...");
    
    const loadServersFromTauri = async () => {
      try {
        const data = await loadServers();
        console.log("📂 Servers caricati:", data);
        
        if (data && data.length > 0) {
          setServers(data);
        } else {
          console.warn("⚠️ Nessun server trovato");
        }
      } catch (error) {
        console.error("❌ Errore caricamento server:", error);
        setServers([]);
      }
    };

    loadServersFromTauri();
  }, []);

  // ✅ Aggiorna automaticamente lo status dei server nel context
  useEffect(() => {
    if (servers.length === 0) return;

    const updatedServers = servers.map(server => {
      const status = getServerStatus(server.id);
      if (status) {
        const newStatus: ServerStatus = status.isOnline ? 'online' : 'offline';
        return { ...server, status: newStatus };
      }
      return server;
    });

    // Solo aggiorna se c'è davvero un cambiamento
    const hasChanges = updatedServers.some((server, index) => 
      server.status !== servers[index]?.status
    );

    if (hasChanges) {
      setServers(updatedServers);
      console.log('🔄 Status server aggiornati automaticamente');
      
      // Aggiorna anche il server selezionato se necessario
      if (selectedServer) {
        const updatedSelectedServer = updatedServers.find(s => s.id === selectedServer.id);
        if (updatedSelectedServer && updatedSelectedServer.status !== selectedServer.status) {
          setSelectedServer(updatedSelectedServer);
        }
      }
    }
  }, [serverStatuses, servers, selectedServer, getServerStatus]);

  const removeServer = async (id: string) => {
    try {
      await deleteServerById(id);
      setServers(prev => prev.filter(server => server.id !== id));
      if (selectedServer?.id === id) {
        setSelectedServer(null);
      }
      console.log("🗑️ Server eliminato:", id);
    } catch (error) {
      console.error("❌ Errore eliminazione server:", error);
    }
  };

  const toggleTerminal = async () => {
    setTerminalVisible((prev) => !prev);
    
    if (terminalVisible && sshSessionId) {
      try {
        await invoke("close_ssh_session", { sessionId: sshSessionId });
        console.log("🔌 Sessione SSH chiusa:", sshSessionId);
      } catch (error) {
        console.error("❌ Errore chiusura sessione SSH:", error);
      }
      setSshSessionId(null);
    }
  };

  const startSshConnection = async (server: Server) => {
    try {
      console.log("🔐 Avvio connessione SSH REALE a:", server.name);
      
      const connectionRequest = {
        host: server.ip,
        port: server.sshPort,
        username: server.sshUser,
        authMethod: server.authMethod,
        password: server.password || null,
        keyPath: server.sshKeyPath || null,
      };

      console.log("📤 Invio richiesta connessione:", connectionRequest);

      const sessionId = await invoke<string>("start_ssh_session", { 
        connection: connectionRequest 
      });
      
      setSshSessionId(sessionId);
      setTerminalVisible(true);
      console.log("✅ Connessione SSH REALE stabilita:", sessionId);
    } catch (error) {
      console.error("❌ Errore connessione SSH:", error);
      throw error;
    }
  };

  const toggleServerStatus = (id: string) => {
    const updated = servers.map((server) => {
      if (server.id === id) {
        const next: Record<ServerStatus, ServerStatus> = {
          online: 'standby',
          standby: 'offline',
          offline: 'online',
        };
        return { ...server, status: next[server.status] };
      }
      return server;
    });

    setServers(updated);

    if (selectedServer?.id === id) {
      setSelectedServer(updated.find((s) => s.id === id) || null);
    }
  };

  return (
    <ServerContext.Provider
      value={{
        servers,
        selectedServer,
        terminalVisible,
        sshSessionId,
        serverStatuses,
        isMonitoring,
        setServers,
        setSelectedServer,
        toggleTerminal,
        toggleServerStatus,
        startSshConnection,
        removeServer,
        refreshServerStatuses,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};