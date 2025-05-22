import React from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import AddServerModal from './AddServerModal';
import { useServer } from '../context/useServer';
import { loadServers } from '@/lib/serverStorage';

const ServerActions: React.FC = () => {
  const { setServers } = useServer();
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
    <div className="absolute top-4 right-6 z-40 flex gap-2">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>

      <AddServerModal />
    </div>
  );
};

export default ServerActions;