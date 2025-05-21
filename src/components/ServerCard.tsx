
import React from 'react';
import type { Server as ServerType } from '../context/ServerContext';
import { Server as ServerIcon } from 'lucide-react';
import { useServer } from '../context/ServerContext';

interface ServerCardProps {
  server: ServerType;
}

const ServerCard: React.FC<ServerCardProps> = ({ server }) => {
  const { setSelectedServer, selectedServer } = useServer();
  
  const statusColor = {
    online: 'server-status-online',
    offline: 'server-status-offline',
    standby: 'server-status-standby'
  };

  const isSelected = selectedServer?.id === server.id;

  return (
    <div 
      className={`bg-card p-4 rounded-lg cursor-pointer server-card ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => setSelectedServer(server)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <ServerIcon className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className="font-medium">{server.name}</h3>
        </div>
        <div className={`${statusColor[server.status]} server-status-dot`} />
      </div>
      
      <div className="text-sm text-muted-foreground mb-1">
        IP: {server.ip}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Type: {server.type}
      </div>
    </div>
  );
};

export default ServerCard;
