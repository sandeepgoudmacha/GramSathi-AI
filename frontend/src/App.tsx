import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/index'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LandingPage, LoginPage, RegisterPage } from '@/pages/Public'
import { DashboardPage, FinancialPage, SchemesPage, SkillsPage, LivelihoodPage } from '@/pages/Core'
import { HealthPage, MarketplacePage, CoordinatorPage, BankPage, AdminPage, ProfilePage } from '@/pages/Management'
import MarketplacePublic from '@/pages/MarketplacePublic'
import { AIAssistant } from '@/components/AIAssistant'

const qc = new QueryClient({
  defaultOptions: { queries: { retry:1, staleTime:30000, refetchOnWindowFocus:true } }
})

function Guard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace/>
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace/>
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuthStore()
  return (
    <>
      <Routes>
        <Route path="/"          element={user ? <Navigate to="/app/dashboard"/> : <LandingPage/>}/>
        <Route path="/login"     element={user ? <Navigate to="/app/dashboard"/> : <LoginPage/>}/>
        <Route path="/register"  element={user ? <Navigate to="/app/dashboard"/> : <RegisterPage/>}/>

        {/* Preview route to inspect LandingPage while signed-in */}
        <Route path="/_preview_landing" element={<LandingPage/>} />

        <Route path="/app/dashboard"   element={<Guard><DashboardPage/></Guard>}/>
        <Route path="/app/financial"   element={<Guard><FinancialPage/></Guard>}/>
        <Route path="/app/schemes"     element={<Guard><SchemesPage/></Guard>}/>
        <Route path="/app/skills"      element={<Guard><SkillsPage/></Guard>}/>
        <Route path="/app/livelihood"  element={<Guard><LivelihoodPage/></Guard>}/>
        <Route path="/app/health"      element={<Guard><HealthPage/></Guard>}/>
        <Route path="/app/marketplace" element={<Guard><MarketplacePage/></Guard>}/>
        <Route path="/marketplace" element={<MarketplacePublic/>}/>
        <Route path="/app/profile"     element={<Guard><ProfilePage/></Guard>}/>

        <Route path="/app/coordinator" element={<Guard roles={['coordinator','admin']}><CoordinatorPage/></Guard>}/>
        <Route path="/app/bank"        element={<Guard roles={['bank_officer','admin']}><BankPage/></Guard>}/>
        <Route path="/app/admin"       element={<Guard roles={['admin']}><AdminPage/></Guard>}/>

        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
      {user && <AIAssistant/>}
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes/>
          <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { fontSize:'13px', borderRadius:'10px', fontFamily:'Inter,sans-serif' },
            success: { iconTheme:{ primary:'#1a7a4a', secondary:'#fff' } },
          }}/>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
