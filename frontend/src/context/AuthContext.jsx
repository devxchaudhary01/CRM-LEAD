import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('crm2_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete axios.defaults.headers.common['Authorization']
  }, [token])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    axios.get('/api/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => { localStorage.removeItem('crm2_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  const _setAuth = (tok, u) => {
    localStorage.setItem('crm2_token', tok)
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
    setToken(tok); setUser(u)
  }

  const login    = async (e,p) => { const {data}=await axios.post('/api/auth/login',{email:e,password:p}); _setAuth(data.token,data.user); return data.user }
  const register = async (payload) => { const {data}=await axios.post('/api/auth/register',payload); if(data.token) _setAuth(data.token,data.user); return data }
  const logout   = () => { localStorage.removeItem('crm2_token'); delete axios.defaults.headers.common['Authorization']; setToken(null); setUser(null) }

  // Called by GoogleSuccessPage after reading token from URL
  const setTokenManually = (tok) => {
    localStorage.setItem('crm2_token', tok)
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
    setToken(tok)
  }

  const role = user?.role || ''
  const isSuperAdmin  = role === 'super_admin'
  const isOrgOwner    = role === 'org_owner'
  const isOpsManager  = role === 'ops_manager'
  const isOpsLead     = role === 'ops_lead'
  const isAgent       = ['c1','c2','c3'].includes(role)
  const canDownload   = ['org_owner','ops_manager','super_admin'].includes(role)
  const canUpload     = role === 'org_owner'
  const canManage     = ['org_owner','ops_manager','super_admin'].includes(role)
  const canAssignRoles= ['org_owner','ops_manager','super_admin'].includes(role)
  const canViewDash   = !isAgent
  const canViewReports= ['org_owner','ops_manager','super_admin'].includes(role)
  const canShare      = ['org_owner','ops_manager','super_admin'].includes(role)
  const canSetFollowUp= ['org_owner','super_admin'].includes(role)
  const orgName       = user?.organization?.name || ''
  const orgPlan       = user?.organization?.plan  || 'free'

  return (
    <Ctx.Provider value={{
      user, token, loading, login, register, logout, setTokenManually,
      isSuperAdmin, isOrgOwner, isOpsManager, isOpsLead, isAgent,
      canDownload, canUpload, canManage, canAssignRoles,
      canViewDash, canViewReports, canShare, canSetFollowUp,
      orgName, orgPlan, role,
    }}>
      {children}
    </Ctx.Provider>
  )
}
