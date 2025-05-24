import React, { useState } from 'react';
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

const ServerSidebar: React.FC = () => {
  const { selectedServer, toggleServerStatus, removeServer, serverStatuses } = useServer();
  const [isConnecting] = useState(false);
  const { toggle } = useTerminalDrawerStore();

  if (!selectedServer) return null;

  const serverStatus = serverStatuses[selectedServer.id];
  const isReallyOnline = serverStatus?.isOnline || false;
  const lastChecked = serverStatus?.lastChecked;
  const responseTime = serverStatus?.responseTime;

  const handleStatusToggle = () => {
    toggleServerStatus(selectedServer.id);
  };

  const handleOpenTerminal = async () => {
    if (!selectedServer) return;

    try {
      await invoke('open_terminal', {
        request: {
          sshUser: selectedServer.sshUser,
          ip: selectedServer.ip,
          sshPort: selectedServer.sshPort,
          password: selectedServer.password ?? null,
        },
      });

      toggle(); // ✅ Apri il drawer integrato
    } catch (error) {
      console.error('❌ Errore apertura terminale:', error);
      toast.error('Errore apertura terminale');
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
        className={`sidebar-command mt-4 ${
          isReallyOnline
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
        onClick={handleOpenTerminal}
        disabled={isConnecting || !isReallyOnline}
        title={!isReallyOnline ? 'Server offline - impossibile connettersi' : ''}
      >
        <Terminal className="h-4 w-4" />
        <span>
          {isConnecting
            ? 'Connecting...'
            : !isReallyOnline
              ? 'Terminal (Offline)'
              : 'Open Terminal'}
        </span>
      </button>

      <button className="sidebar-command mt-4">
        <Settings className="h-4 w-4" />
        <span>Server Settings</span>
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
    </div>
  );
};

export default ServerSidebar;