import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, DollarSign, BookOpen, TrendingUp, Briefcase,
  Heart, ShoppingBag, Users, Building2, Settings, Bell, LogOut,
  ChevronRight, Menu, X
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import GoogleTranslate from '@/components/ui/GoogleTranslate'
import { useAuthStore, useWSStore } from '@/store/index'
import { notificationsApi } from '@/services/api'
import { cn, initials, ago } from '@/utils/helpers'
import toast from 'react-hot-toast'

const NAV = [
  { id:'dashboard',   icon:LayoutDashboard, label:'Dashboard',        path:'/app/dashboard',   roles:['member','coordinator','bank_officer','admin'] },
  { id:'financial',   icon:DollarSign,      label:'Financial',         path:'/app/financial',   roles:['member','coordinator','bank_officer','admin'] },
  { id:'schemes',     icon:BookOpen,         label:'Gov. Schemes',     path:'/app/schemes',     roles:['member','coordinator','admin'] },
  { id:'skills',      icon:TrendingUp,       label:'Skills & Training', path:'/app/skills',     roles:['member','coordinator','admin'] },
  { id:'livelihood',  icon:Briefcase,        label:'Livelihood AI',     path:'/app/livelihood',  roles:['member','coordinator','admin'] },
  { id:'health',      icon:Heart,            label:'Health Guidance',   path:'/app/health',      roles:['member','coordinator','admin'] },
  { id:'marketplace', icon:ShoppingBag,      label:'Marketplace',       path:'/app/marketplace', roles:['member','coordinator','bank_officer','admin'] },
  { id:'coordinator', icon:Users,            label:'Group Mgmt',        path:'/app/coordinator', roles:['coordinator','admin'] },
  { id:'bank',        icon:Building2,        label:'Loan Approvals',    path:'/app/bank',        roles:['bank_officer','admin'] },
  { id:'admin',       icon:Settings,         label:'Admin Panel',       path:'/app/admin',       roles:['admin'] },
]

const ROLE_LABELS: Record<string,string> = {
  member:'SHG Member', coordinator:'Coordinator', bank_officer:'Bank Officer', admin:'Administrator'
}

function Sidebar({ collapsed, setCollapsed }: any) {
  const { user, logout } = useAuthStore()
  const loc = useLocation()
  const items = NAV.filter(n => user && n.roles.includes(user.role))

  return (
    <motion.aside animate={{ width: collapsed ? 62 : 228 }} transition={{ duration:0.18, ease:'easeInOut' }}
      className="bg-[#0d1f14] flex flex-col h-screen overflow-hidden shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-lg shrink-0">🌱</div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <div className="font-display font-bold text-white text-sm leading-tight whitespace-nowrap">GramSathi AI</div>
            <div className="text-[10px] text-white/40">Rural Empowerment</div>
          </div>
        )}
        <button onClick={() => setCollapsed((c: boolean) => !c)} className="text-white/40 hover:text-white transition-colors ml-auto shrink-0">
          {collapsed ? <ChevronRight size={14}/> : <X size={14}/>}
        </button>
      </div>

      {/* User chip */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials(user.full_name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
              <p className="text-white/40 text-[10px]">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {items.map(item => {
          const active = loc.pathname === item.path
          return (
            <Link key={item.path} to={item.path}>
              <div className={cn('sidebar-link', active && 'active', collapsed && 'justify-center px-2')}>
                <item.icon size={17} className="shrink-0"/>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-white/10 pt-2">
        <button onClick={logout} className={cn('sidebar-link w-full text-red-400/70 hover:text-red-300 hover:bg-red-500/10', collapsed && 'justify-center px-2')}>
          <LogOut size={17} className="shrink-0"/>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  )
}

function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useAuthStore()
  const { unreadCount, setUnreadCount } = useWSStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const nav = useNavigate()

  const { data: notifData, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
    refetchInterval: 20000,
  })

  useEffect(() => {
    if (notifData) setUnreadCount(notifData.unread_count || 0)
  }, [notifData])

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await notificationsApi.markAllRead()
    setUnreadCount(0)
    refetch()
  }

  const markOne = async (id: number) => {
    await notificationsApi.markRead(id)
    refetch()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
      <div>
        <h1 className="font-display text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 -mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5 relative" ref={notifRef}>
        {/* Notif bell */}
        <button onClick={() => setNotifOpen(o => !o)}
          className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell size={16}/>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Google Translate widget (loads once) */}
        <GoogleTranslate />

        {/* Notif dropdown */}
        <AnimatePresence>
          {notifOpen && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}
              className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-sm text-gray-800">
                  Notifications {unreadCount > 0 && <span className="badge badge-red ml-1">{unreadCount}</span>}
                </span>
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {!notifData?.notifications?.length
                  ? <p className="text-center py-8 text-gray-400 text-sm">No notifications</p>
                  : notifData.notifications.slice(0,15).map((n: any) => (
                    <div key={n.id} onClick={() => { markOne(n.id); setNotifOpen(false) }}
                      className={cn('px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors', !n.is_read && 'bg-brand-50/60')}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 shrink-0"/>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{ago(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User avatar */}
        <button onClick={() => { setNotifOpen(false); nav('/app/profile') }}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-[11px] font-bold text-white">
            {user ? initials(user.full_name) : '?'}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  )
}

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const { token } = useAuthStore()
  const { connect, connected, setOnNotification } = useWSStore()
  const qc = useQueryClient()

  useEffect(() => {
    if (token && !connected) connect(token)
  }, [token])

  useEffect(() => {
    setOnNotification(() => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['my-loans'] })
      qc.invalidateQueries({ queryKey: ['loan-detail'] })
    })
    return () => setOnNotification(null)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle}/>
        <main className="flex-1 overflow-y-auto p-5">
          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:0.2}}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
