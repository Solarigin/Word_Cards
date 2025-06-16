import { create } from 'zustand'

interface AuthState {
  token: string | null
  setToken: (token: string | null) => void
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}))
