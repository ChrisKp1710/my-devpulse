import type { Server } from "@/context/ServerContext.types";

export const saveServers = async (servers: Server[]) => {
  if (!("__TAURI__" in window)) return;
  const { saveServers } = await import("./serverStorage.tauri");
  return saveServers(servers);
};

export const loadServers = async (): Promise<Server[]> => {
  if (!("__TAURI__" in window)) return [];
  const { loadServers } = await import("./serverStorage.tauri");
  return loadServers();
};