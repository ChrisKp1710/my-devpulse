// src/components/ServerActions.tsx - Menu dropdown
import React from 'react';
import { Button } from './ui/button';
import { MoreVertical, Wifi, FolderOpen, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AddServerModal from './AddServerModal';
import { useServer } from '../context/useServer';
import { loadServers } from '@/lib/serverStorage';

const ServerActions: React.FC = () => {
  const { setServers, refreshServerStatuses, isMonitoring } = useServer();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedServers = await loadServers();
      setServers(updatedServers);
    } catch (error) {
      console.error("❌ Error refreshing servers:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckStatus = () => {
    refreshServerStatuses();
  };

  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedServers = await loadServers();
      setServers(updatedServers);
      refreshServerStatuses();
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isRefreshing || isMonitoring;

  return (
    <div className="absolute top-4 right-6 z-40 flex gap-2">
      {/* ✅ Menu Azioni */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded-md transition-colors text-sm flex items-center gap-2"
            disabled={isLoading}
          >
            <MoreVertical className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCheckStatus} disabled={isMonitoring}>
            <Wifi className="mr-2 h-4 w-4" />
            Test Connection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Reload from File
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleFullRefresh} disabled={isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddServerModal />
    </div>
  );
};

export default ServerActions;