
import React from 'react';
import { useServer } from '../context/useServer';
import { Power, Play, Terminal, Settings, StopCircle } from 'lucide-react';

const ServerSidebar: React.FC = () => {
  const { selectedServer, toggleTerminal, toggleServerStatus } = useServer();
  
  if (!selectedServer) return null;

  const handleStatusToggle = () => {
    if (selectedServer) {
      toggleServerStatus(selectedServer.id);
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
          onClick={toggleTerminal}
        >
          <Terminal className="h-4 w-4" />
          <span>Open Terminal</span>
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
