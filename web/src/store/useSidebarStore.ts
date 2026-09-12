import { create } from 'zustand';

interface SidebarState {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
}));
