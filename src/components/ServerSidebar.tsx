import React, { useState } from 'react';
import { useServer } from '../context/useServer';
import { Power, Play, Terminal, Settings, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

const ServerSidebar: React.FC = () => {
  const { selectedServer, toggleServerStatus, startSshConnection } = useServer();
  const [isConnecting, setIsConnecting] = useState(false);
  
  if (!selectedServer) return null;

  const handleStatusToggle = () => {
    if (selectedServer) {
      toggleServerStatus(selectedServer.id);
    }
  };

  const handleOpenTerminal = async () => {
    if (!selectedServer) return;
    
    setIsConnecting(true);
    try {
      await startSshConnection(selectedServer);
      toast.success(`✅ Connesso a ${selectedServer.name}`);
    } catch (error) {
      console.error("❌ Errore connessione:", error);
      toast.error(`❌ Errore: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-card w-64 border-l border-border h-full p-4">
      <h3 className="text-lg font-medium mb-4">{selectedServer.name}</h3>
      
      <div className="flex flex-col gap-2">
        <div className="text-sm text-muted-foreground mb-4">
          <div>Status: <span className="text-foreground">{selectedServer.status}</span></div>
          <div>IP: <span className="text-foreground">{selectedServer.ip}</span></div>
          <div>Type: <span className="text-foreground">{selectedServer.type}</span></div>
          <div>User: <span className="text-foreground">{selectedServer.sshUser}</span></div>
          <div>Port: <span className="text-foreground">{selectedServer.sshPort}</span></div>
        </div>
        
        <div className="border-t border-border my-2"></div>
        <h4 className="text-sm font-medium mb-2">Commands</h4>
        
        <button 
          className="sidebar-command"
          onClick={handleStatusToggle}
        >
          {selectedServer.status === 'online' ? (
            <>
              <StopCircle className="h-4 w-4" />
              <span>Shutdown Server</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Start Server</span>
            </>
          )}
        </button>
        
        <button className="sidebar-command">
          <Power className="h-4 w-4" />
          <span>Wake On LAN</span>
        </button>
        
        <button 
          className="sidebar-command bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
          onClick={handleOpenTerminal}
          disabled={isConnecting}
        >
          <Terminal className="h-4 w-4" />
          <span>{isConnecting ? 'Connecting...' : 'Open Terminal'}</span>
        </button>
        
        <button className="sidebar-command mt-4">
          <Settings className="h-4 w-4" />
          <span>Server Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ServerSidebar;