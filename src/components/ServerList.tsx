import React from 'react';
import ServerCard from './ServerCard';
import AddServerModal from './AddServerModal';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useServer } from '../context/useServer';
import { loadServers } from '@/lib/serverStorage';
import type { Server } from "../context/ServerContext.types";

const ServerList: React.FC = () => {
  const { servers, setServers } = useServer();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedServers = await loadServers();
      setServers(updatedServers);
      console.log("🔄 Server list refreshed");
    } catch (error) {
      console.error("❌ Error refreshing servers:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-foreground">Servers</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <AddServerModal />
        </div>
      </div>

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