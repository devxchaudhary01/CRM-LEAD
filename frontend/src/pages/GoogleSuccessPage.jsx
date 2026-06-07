// pages/GoogleSuccessPage.jsx
// This page handles the redirect from Google OAuth
// URL: /auth/google/success?token=xxx&needsOrg=0|1

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function GoogleSuccessPage() {
  const [params]  = useSearchParams()
  const nav       = useNavigate()
  const { setTokenManually } = useAuth()
  const [orgName, setOrgName]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [needsOrg, setNeedsOrg]   = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const token    = params.get('token')
    const needsOrgParam = params.get('needsOrg') === '1'
    const error    = params.get('error')

    if (error) {
      toast.error('Google login failed. Please try again.')
      nav('/login')
      return
    }

    if (!token) {
      toast.error('No token received from Google')
      nav('/login')
      return
    }

    // Store token
    localStorage.setItem('crm2_token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

    if (needsOrgParam) {
      setNeedsOrg(true)
      setLoading(false)
    } else {
      toast.success('Signed in with Google! 🎉')
      nav('/dashboard')
    }
  }, [])

  const saveOrgName = async () => {
    if (!orgName.trim()) return toast.error('Please enter your organization name')
    setSaving(true)
    try {
      await axios.put('/api/auth/org', { name: orgName.trim() })
      toast.success('Organization set up! Welcome 🎉')
      nav('/dashboard')
      window.location.reload()
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading && !needsOrg) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, background:'var(--navy)' }}>
        <div className="spinner" style={{ borderTopColor:'#fff' }}/>
        <p style={{ color:'rgba(255,255,255,.6)', fontSize:14 }}>Completing Google sign in…</p>
      </div>
    )
  }

  if (needsOrg) {
    return (
      <div className="auth-page">
        <div className="auth-glow"/>
        <div className="auth-card" style={{ maxWidth:420 }}>
          <div className="auth-brand">
            <div className="auth-mark">CR</div>
            <div><h1 style={{ fontSize:20, fontWeight:900 }}>CRM Pro</h1></div>
          </div>
          <h2>One last step!</h2>
          <p className="sub">Enter your organization or institution name to complete setup.</p>

          <div className="form-group" style={{ marginTop:20 }}>
            <label>🏢 Institution / Organization Name</label>
            <input
              placeholder="e.g. Sunrise Academy, ABC Corp"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveOrgName()}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width:'100%', padding:'11px', marginTop:8 }}
            onClick={saveOrgName}
            disabled={saving}
          >
            {saving ? 'Setting up…' : 'Complete Setup →'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
