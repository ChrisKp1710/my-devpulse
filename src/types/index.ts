// src/types/index.ts
export interface Server {
    id: string;
    name: string;
    ip: string;
    mac: string;
    sshUser: string;
    sshPort: number;
    sshKey: string;
    description: string;
    status: 'online' | 'offline' | 'standby';
  }
  
  // src/context/ServersContext.tsx
  // Espandere il contesto esistente per includere tutte le proprietà