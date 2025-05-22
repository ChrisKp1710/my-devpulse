import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Server, ServerStatus } from './ServerContext.types';
import { invoke } from "@tauri-apps/api/core";

interface ServerContextType {
  servers: Server[];
  selectedServer: Server | null;
  terminalVisible: boolean;
  setServers: (servers: Server[]) => void;
  setSelectedServer: (server: Server | null) => void;
  toggleTerminal: () => void;
  toggleServerStatus: (id: string) => void;
}

/* eslint-disable react-refresh/only-export-components */
export const ServerContext = createContext<ServerContextType | undefined>(
  undefined
);

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);

  useEffect(() => {
    console.log("🔁 Caricamento server da Tauri...");
    
    const loadServersFromTauri = async () => {
      try {
        // Carica i server usando il comando Tauri
        const data = await invoke<Server[]>("load_servers");
        console.log("📂 Servers caricati da Tauri:", data);
        
        if (data && data.length > 0) {
          setServers(data);
        } else {
          console.warn("⚠️ Nessun server trovato");
        }
      } catch (error) {
        console.error("❌ Errore caricamento server:", error);
        // In caso di errore, usa un array vuoto
        setServers([]);
      }
    };

    loadServersFromTauri();
  }, []);

  const toggleTerminal = () => setTerminalVisible((prev) => !prev);

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
        setServers,
        setSelectedServer,
        toggleTerminal,
        toggleServerStatus,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};