import { create } from 'zustand'

// Ephemeral interaction state only. Never copy Convex query results here.
type UiState = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
