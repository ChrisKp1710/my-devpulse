export type ServerStatus = 'online' | 'offline' | 'standby';

export interface Server {
  id: string;
  name: string;
  ip: string;
  sshPort: number;
  sshUser: string;
  password?: string;
  sshKeyPath?: string;
  sshKey: string;
  authMethod: "password" | "key";
  type: string;
  status: ServerStatus;
  macAddress?: string;
  wolEnabled?: boolean;
  shutdownCommand?: string;
}