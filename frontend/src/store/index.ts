import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'

export type UserRole = 'member'|'coordinator'|'bank_officer'|'admin'

export interface User {
  id: number; full_name: string; phone: string; email?: string
  role: UserRole; is_active: number; is_verified: number
  profile_image?: string; preferred_language: string; created_at: string
  profile?: any
}

interface AuthState {
  user: User|null; token: string|null; isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, isLoading: false,

      login: async (phone, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login({ phone, password })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          set({ user: { ...data.user, profile: data.profile }, token: data.access_token })
          toast.success(`Welcome, ${data.user.full_name.split(' ')[0]}! 🌱`)
        } catch(e: any) {
          toast.error(e.response?.data?.detail || 'Login failed')
          throw e
        } finally { set({ isLoading: false }) }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          await authApi.register(data)
          toast.success('Account created! Please log in.')
        } catch(e: any) {
          toast.error(e.response?.data?.detail || 'Registration failed')
          throw e
        } finally { set({ isLoading: false }) }
      },

      logout: () => {
        localStorage.clear()
        set({ user: null, token: null })
        window.location.href = '/'
      },

      refreshUser: async () => {
        try {
          const { data } = await authApi.me()
          set(s => ({ user: { ...s.user!, ...data } }))
        } catch {}
      },
    }),
    { name: 'gramsathi-auth', partialize: s => ({ user: s.user, token: s.token }) }
  )
)

/* ── WebSocket Store ── */
interface WSState {
  ws: WebSocket|null; connected: boolean; unreadCount: number
  connect: (token: string) => void
  disconnect: () => void
  setUnreadCount: (n: number) => void
  onNotification: ((n: any) => void)|null
  setOnNotification: (fn: ((n: any) => void)|null) => void
}

export const useWSStore = create<WSState>((set, get) => ({
  ws: null, connected: false, unreadCount: 0, onNotification: null,

  connect: (token) => {
    const existing = get().ws
    if (existing && existing.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Connect to backend on port 5000 (development) or use current port (production)
    const port = import.meta.env.DEV ? '5000' : window.location.port || ''
    const host = window.location.hostname
    const url = `${protocol}//${host}:${port}/ws?token=${token}`

    let reconnectTimer: ReturnType<typeof setTimeout>|null = null

    const socket = new WebSocket(url)
    socket.onopen = () => { set({ ws: socket, connected: true }); if (reconnectTimer) clearTimeout(reconnectTimer) }
    socket.onclose = () => {
      set({ connected: false, ws: null })
      reconnectTimer = setTimeout(() => {
        const t = localStorage.getItem('access_token')
        if (t) get().connect(t)
      }, 5000)
    }
    socket.onerror = () => {}
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'notification') {
          set(s => ({ unreadCount: s.unreadCount + 1 }))
          const fn = get().onNotification
          if (fn) fn(data.notification)
          toast(`${data.notification.title}`, { icon: '🔔', duration: 5000 })
        }
      } catch {}
    }
    set({ ws: socket })
  },

  disconnect: () => { get().ws?.close(); set({ ws: null, connected: false }) },
  setUnreadCount: (n) => set({ unreadCount: n }),
  setOnNotification: (fn) => set({ onNotification: fn }),
}))
