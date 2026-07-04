import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout           from './components/layout/Layout'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import GoogleSuccessPage from './pages/GoogleSuccessPage'
import DashboardPage    from './pages/DashboardPage'
import LeadsPage        from './pages/LeadsPage'
import PlannerPage      from './pages/PlannerPage'
import UsersPage        from './pages/UsersPage'
import ReportsPage      from './pages/ReportsPage'
import PricingPage      from './pages/PricingPage'

function Guard({ children, requireDash, requireManage, requireReports, requireOwner }) {
  const { user, loading, canViewDash, canManage, canViewReports, isOrgOwner, isAgent } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner"/>
    </div>
  )
  if (!user)              return <Navigate to="/login" replace/>
  if (requireDash    && !canViewDash)    return <Navigate to="/leads" replace/>
  if (requireManage  && !canManage)      return <Navigate to="/leads" replace/>
  if (requireReports && !canViewReports) return <Navigate to="/leads" replace/>
  if (requireOwner   && !isOrgOwner)     return <Navigate to="/dashboard" replace/>
  return children
}

function AppRoutes() {
  const { user, isAgent } = useAuth()
  const home = isAgent ? '/leads' : '/dashboard'
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"                  element={user ? <Navigate to={home}/> : <LoginPage/>}/>
      <Route path="/register"               element={user ? <Navigate to={home}/> : <RegisterPage/>}/>
      <Route path="/auth/google/success"    element={<GoogleSuccessPage/>}/>

      {/* Default */}
      <Route path="/" element={<Navigate to={home}/>}/>

      {/* Protected */}
      <Route path="/dashboard" element={<Guard requireDash><Layout title="Dashboard"><DashboardPage/></Layout></Guard>}/>
      <Route path="/leads"     element={<Guard><Layout title="Leads & Data"><LeadsPage/></Layout></Guard>}/>
      <Route path="/planner"   element={<Guard><Layout title="Follow-up Planner"><PlannerPage/></Layout></Guard>}/>
      <Route path="/reports"   element={<Guard requireReports><Layout title="Reports"><ReportsPage/></Layout></Guard>}/>
      <Route path="/users"     element={<Guard requireManage><Layout title="Team Management"><UsersPage/></Layout></Guard>}/>
      <Route path="/pricing"   element={<Guard requireOwner><PricingPage/></Guard>}/>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style:{ fontFamily:'Outfit,sans-serif', fontSize:13 }, duration:3500 }}/>
        <AppRoutes/>
      </BrowserRouter>
    </AuthProvider>
  )
}
