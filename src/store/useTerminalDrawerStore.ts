// src/store/useTerminalDrawerStore.ts
import { create } from 'zustand';

interface TerminalDrawerState {
  isOpen: boolean;
  isConnected: boolean;  // ✅ NUOVO: traccia stato SSH
  open: () => void;
  close: () => void;
  toggle: () => void;
  setConnected: (connected: boolean) => void;  // ✅ NUOVO
  connect: () => void;  // ✅ NUOVO: connetti + apri
  disconnect: () => void;  // ✅ NUOVO: disconnetti + chiudi
}

export const useTerminalDrawerStore = create<TerminalDrawerState>((set) => ({
  isOpen: false,
  isConnected: false,
  
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  
  // ✅ Connetti SSH + Apri drawer
  connect: () => set({ isConnected: true, isOpen: true }),
  
  // ✅ Disconnetti SSH + Chiudi drawer
  disconnect: () => set({ isConnected: false, isOpen: false }),
}));