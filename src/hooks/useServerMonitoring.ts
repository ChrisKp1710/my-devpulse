// src/hooks/useServerMonitoring.ts
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Server } from '@/context/ServerContext.types';

interface PingResult {
  isOnline: boolean;
  responseTimeMs?: number;
  errorMessage?: string;
}

interface ServerStatus {
  isOnline: boolean;
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

export const useServerMonitoring = (servers: Server[]) => {
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Funzione per fare ping a un singolo server
  const pingServer = async (server: Server): Promise<PingResult | null> => {
    try {
      console.log(`🏓 Ping a ${server.name} (${server.ip}:${server.sshPort})`);
      
      const result = await invoke<PingResult>('ping_server', {
        host: server.ip,
        port: server.sshPort
      });
      
      console.log(`📊 Risultato ping ${server.name}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Errore ping ${server.name}:`, error);
      return {
        isOnline: false,
        errorMessage: `Errore: ${error}`
      };
    }
  };

  // Funzione per aggiornare lo status di tutti i server
  const updateAllServerStatuses = async () => {
    if (servers.length === 0) return;
    
    setIsMonitoring(true);
    
    const statusPromises = servers.map(async (server) => {
      const pingResult = await pingServer(server);
      
      if (pingResult) {
        return {
          serverId: server.id,
          status: {
            isOnline: pingResult.isOnline,
            lastChecked: Date.now(),
            responseTime: pingResult.responseTimeMs,
            error: pingResult.errorMessage
          }
        };
      }
      
      return {
        serverId: server.id,
        status: {
          isOnline: false,
          lastChecked: Date.now(),
          error: 'Ping fallito'
        }
      };
    });

    try {
      const results = await Promise.all(statusPromises);
      
      const newStatuses: Record<string, ServerStatus> = {};
      results.forEach(({ serverId, status }) => {
        newStatuses[serverId] = status;
      });
      
      setServerStatuses(newStatuses);
      console.log('✅ Aggiornamento status completato:', newStatuses);
    } catch (error) {
      console.error('❌ Errore aggiornamento status:', error);
    } finally {
      setIsMonitoring(false);
    }
  };

  // Monitoring automatico ogni 30 secondi
  useEffect(() => {
    if (servers.length === 0) return;

    // Primo check immediato
    updateAllServerStatuses();

    // Setup intervallo per check periodici
    const interval = setInterval(() => {
      updateAllServerStatuses();
    }, 30000); // 30 secondi

    return () => clearInterval(interval);
  }, [servers]);

  // Funzione per forzare un refresh manuale
  const refreshServerStatuses = () => {
    updateAllServerStatuses();
  };

  // Funzione per ottenere lo status di un server specifico
  const getServerStatus = (serverId: string): ServerStatus | null => {
    return serverStatuses[serverId] || null;
  };

  return {
    serverStatuses,
    isMonitoring,
    refreshServerStatuses,
    getServerStatus
  };
};