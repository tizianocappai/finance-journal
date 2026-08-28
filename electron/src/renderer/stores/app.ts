import { create } from 'zustand';

interface AppState {
  ready: boolean;
}

export const useAppStore = create<AppState>()(() => ({
  ready: true,
}));
