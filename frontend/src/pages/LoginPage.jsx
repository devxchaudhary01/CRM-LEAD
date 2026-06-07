import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { RiGoogleLine, RiArrowRightLine } from 'react-icons/ri'

export default function LoginPage() {
  const { login }   = useAuth()
  const nav         = useNavigate()
  const [params]    = useSearchParams()
  const [f, setF]   = useState({ email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState('email')
  const [phone, setPhone]     = useState('')
  const [otp, setOtp]         = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const set = k => e => setF(p=>({...p,[k]:e.target.value}))

  // Show error from Google OAuth failure
  const googleError = params.get('error')

  const submitEmail = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const u = await login(f.email, f.password)
      toast.success(`Welcome back, ${u.name}! 👋`)
      nav(['c1','c2','c3'].includes(u.role) ? '/leads' : '/dashboard')
    } catch(err) { toast.error(err.response?.data?.message || 'Invalid credentials') }
    finally { setLoading(false) }
  }

  // Google login — redirects to backend which redirects to Google
  const googleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google'
  }

  const sendOtp = () => {
    if (!phone) return toast.error('Enter your phone number')
    setOtpSent(true)
    toast('OTP login is Phase 2 — demo mode 🚧', { icon:'ℹ️' })
  }

  return (
    <div className="auth-page">
      <div className="auth-glow"/>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-mark">CR</div>
          <div><h1 style={{fontSize:20,fontWeight:900}}>CRM Pro</h1><span style={{fontSize:11,color:'var(--muted)'}}>v3.0 — Management System</span></div>
        </div>
        <h2>Sign in</h2>
        <p className="sub">Access your organization dashboard</p>

        {/* Google error message */}
        {googleError && (
          <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#991B1B' }}>
            Google login failed. Please try again or use email login.
          </div>
        )}

        {/* Google button */}
        <button onClick={googleLogin} style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          padding:'11px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff',
          cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:600,
          marginBottom:14, transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,.06)',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
        >
          <RiGoogleLine size={18} color="#EA4335"/>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>or sign in with</span>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:16,background:'var(--bg)',borderRadius:9,padding:3}}>
          {[{k:'email',lbl:'📧 Email'},{k:'otp',lbl:'📱 OTP'}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              flex:1,padding:'7px',borderRadius:7,border:'none',cursor:'pointer',
              fontFamily:'Outfit,sans-serif',fontWeight:600,fontSize:12,
              background:tab===t.k?'var(--surface)':'transparent',
              color:tab===t.k?'var(--primary)':'var(--muted)',
              boxShadow:tab===t.k?'var(--shadow)':'none',transition:'all .15s',
            }}>{t.lbl}</button>
          ))}
        </div>

        {/* Email login */}
        {tab==='email' && (
          <form onSubmit={submitEmail}>
            <div className="form-group"><label>Email</label><input type="email" placeholder="you@org.com" value={f.email} onChange={set('email')} required/></div>
            <div className="form-group"><label>Password</label><input type="password" placeholder="••••••••" value={f.password} onChange={set('password')} required/></div>
            <button className="btn btn-primary" style={{width:'100%',padding:'11px',marginTop:4}} disabled={loading}>
              {loading?'Signing in…':<>Sign In <RiArrowRightLine/></>}
            </button>
          </form>
        )}

        {/* OTP login */}
        {tab==='otp' && (
          <div>
            <div className="form-group">
              <label>Mobile Number</label>
              <div style={{display:'flex',gap:8}}>
                <input placeholder="+91 98765 43210" value={phone} onChange={e=>setPhone(e.target.value)} style={{flex:1}}/>
                <button type="button" className="btn btn-outline btn-sm" onClick={sendOtp} disabled={otpSent}>
                  {otpSent?'Sent ✓':'Send OTP'}
                </button>
              </div>
            </div>
            {otpSent && (
              <div className="form-group">
                <label>Enter OTP</label>
                <input placeholder="6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6}/>
              </div>
            )}
            <button className="btn btn-primary" style={{width:'100%',padding:'11px'}} disabled={!otpSent}>
              Verify & Sign In
            </button>
            <div className="auth-info" style={{marginTop:10}}>
              <strong>Coming in Phase 2</strong> — SMS OTP via Twilio/MSG91
            </div>
          </div>
        )}

        <div className="auth-link" style={{marginTop:16}}>
          New organization? <Link to="/register">Register here</Link>
        </div>

        <div className="auth-info" style={{marginTop:10}}>
          <strong>C1/C2/C3 agents:</strong> You'll land on Leads (no dashboard).<br/>
          <strong>Ops Lead:</strong> Dashboard view only, no downloads.
        </div>
      </div>
    </div>
  )
}
