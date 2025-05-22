import React from 'react';
import ServerCard from './ServerCard';
import { useServer } from '../context/useServer';
import type { Server } from "../context/ServerContext.types";

const ServerList: React.FC = () => {
  const { servers } = useServer();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Servers</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server: Server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No servers found. Add your first server to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default ServerList;