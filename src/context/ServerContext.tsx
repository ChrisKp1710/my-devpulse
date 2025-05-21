
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ServerStatus = 'online' | 'offline' | 'standby';

export interface Server {
  id: string;
  name: string;
  status: ServerStatus;
  ip: string;
  type: string;
}

interface ServerContextType {
  servers: Server[];
  selectedServer: Server | null;
  terminalVisible: boolean;
  setSelectedServer: (server: Server | null) => void;
  toggleTerminal: () => void;
  toggleServerStatus: (id: string) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

// Sample data
const initialServers: Server[] = [
  { id: '1', name: 'Production Server', status: 'online', ip: '192.168.1.100', type: 'Web Server' },
  { id: '2', name: 'Database Server', status: 'online', ip: '192.168.1.101', type: 'Database' },
  { id: '3', name: 'Backup Server', status: 'standby', ip: '192.168.1.102', type: 'Backup' },
  { id: '4', name: 'Development Server', status: 'offline', ip: '192.168.1.103', type: 'Development' },
  { id: '5', name: 'Testing Server', status: 'online', ip: '192.168.1.104', type: 'Testing' },
  { id: '6', name: 'Staging Server', status: 'standby', ip: '192.168.1.105', type: 'Staging' },
];

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);

  const toggleTerminal = () => {
    setTerminalVisible(prev => !prev);
  };

  const toggleServerStatus = (id: string) => {
    setServers(prev => prev.map(server => {
      if (server.id === id) {
        const newStatus: { [key in ServerStatus]: ServerStatus } = {
          'online': 'standby',
          'standby': 'offline',
          'offline': 'online'
        };
        return { ...server, status: newStatus[server.status] };
      }
      return server;
    }));

    // Update selected server if it's the one being toggled
    if (selectedServer?.id === id) {
      const updatedServer = servers.find(s => s.id === id);
      if (updatedServer) {
        setSelectedServer({ ...updatedServer });
      }
    }
  };

  return (
    <ServerContext.Provider 
      value={{ 
        servers, 
        selectedServer, 
        terminalVisible,
        setSelectedServer, 
        toggleTerminal,
        toggleServerStatus
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
