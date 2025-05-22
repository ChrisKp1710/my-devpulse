import React, { useState } from 'react';
import { useServer } from '../context/useServer';
import { Power, Play, Terminal, Settings, StopCircle, Trash } from 'lucide-react';
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

const ServerSidebar: React.FC = () => {
  const { selectedServer, toggleServerStatus, startSshConnection, removeServer } = useServer();
  const [isConnecting, setIsConnecting] = useState(false);

  if (!selectedServer) return null;

  const handleStatusToggle = () => {
    toggleServerStatus(selectedServer.id);
  };

  const handleOpenTerminal = async () => {
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

  const handleDelete = async () => {
    try {
      await removeServer(selectedServer.id);
      toast.success(`🗑️ Server "${selectedServer.name}" eliminato`);
    } catch (error) {
      toast.error(`❌ Errore eliminazione server: ${error}`);
    }
  };

  return (
    <div className="bg-card w-64 border-l border-border h-full p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-medium mb-4">{selectedServer.name}</h3>

        <div className="text-sm text-muted-foreground mb-4">
          <div>Status: <span className="text-foreground">{selectedServer.status}</span></div>
          <div>IP: <span className="text-foreground">{selectedServer.ip}</span></div>
          <div>Type: <span className="text-foreground">{selectedServer.type}</span></div>
          <div>User: <span className="text-foreground">{selectedServer.sshUser}</span></div>
          <div>Port: <span className="text-foreground">{selectedServer.sshPort}</span></div>
        </div>

        <div className="border-t border-border my-2" />
        <h4 className="text-sm font-medium mb-2">Commands</h4>

        <button className="sidebar-command" onClick={handleStatusToggle}>
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

      {/* 🔴 Bottone Elimina Server */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            className="w-full mt-6 flex justify-center items-center gap-2"
          >
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
    </div>
  );
};

export default ServerSidebar;