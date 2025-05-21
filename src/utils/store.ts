// src/utils/store.ts
import { Store } from "tauri-plugin-store-api";

export type Server = {
  id: string;
  ip: string;
  sshPort: number;
  sshUser: string;
  sshKey: string;
};

const store = new Store("servers.json");

export const saveServer = async (server: Server): Promise<void> => {
  const servers: Server[] = (await store.get("servers")) || [];
  const updatedServers = servers.map((s) =>
    s.id === server.id ? server : s
  );
  if (!servers.find((s) => s.id === server.id)) {
    updatedServers.push(server);
  }
  await store.set("servers", updatedServers);
};

export const getServers = async (): Promise<Server[]> => {
  return ((await store.get("servers")) as Server[]) || [];
};