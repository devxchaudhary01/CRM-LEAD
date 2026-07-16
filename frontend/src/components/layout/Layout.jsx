import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { RiDashboardLine, RiTeamLine, RiBarChart2Line, RiUserSettingsLine, RiLogoutBoxLine, RiVipCrownLine, RiCalendarLine } from 'react-icons/ri'

const ROLE_LABEL = {
  super_admin:'Super Admin', org_owner:'Business Owner',
  ops_manager:'Ops Manager', ops_lead:'Ops Lead',
  c1:'C1 Agent', c2:'C2 Agent', c3:'C3 Agent'
}
const PLAN_COLOR = { trial:'#94A3B8', free:'#94A3B8', pro:'#F59E0B' }
const PLAN_LABELS = { trial:'Trial pack', free:'Trial pack', pro:'Pro' }

export default function Layout({ children, title }) {
  const { user, logout, canViewDash, canManage, canViewReports, isOrgOwner, orgName, orgPlan, role } = useAuth()
  const nav = useNavigate()
  const planKey = orgPlan === 'free' ? 'trial' : orgPlan
  const planLabel = PLAN_LABELS[planKey] || 'Trial pack'
  const doLogout = () => { logout(); toast.success('Signed out'); nav('/login') }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark">CR</div>
          <div className="sb-logo-text"><h2>CRM Pro</h2><span>v3.0</span></div>
        </div>

        {orgName && (
          <div className="sb-org">
            <strong>🏢 {orgName}</strong>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:3}}>
              <RiVipCrownLine size={10} style={{color:PLAN_COLOR[planKey]}}/>
              <span style={{fontSize:10,color:PLAN_COLOR[planKey],fontWeight:700,textTransform:'uppercase'}}>{planLabel.toUpperCase()}</span>
            </span>
          </div>
        )}

        <nav className="sb-nav">
          <div className="sb-section">
            <div className="sb-section-title">Main</div>
            {canViewDash && (
              <NavLink to="/dashboard" className={({isActive})=>`nav-item${isActive?' active':''}`}>
                <RiDashboardLine/> Dashboard
              </NavLink>
            )}
            <NavLink to="/leads" className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <RiTeamLine/> Leads & Data
            </NavLink>
            <NavLink to="/planner" className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <RiCalendarLine/> Planner
            </NavLink>
          </div>

          {canManage && (
            <div className="sb-section">
              <div className="sb-section-title">Management</div>
              {canViewReports && (
                <NavLink to="/reports" className={({isActive})=>`nav-item${isActive?' active':''}`}>
                  <RiBarChart2Line/> Reports
                </NavLink>
              )}
              <NavLink to="/users" className={({isActive})=>`nav-item${isActive?' active':''}`}>
                <RiUserSettingsLine/> Team
              </NavLink>
            </div>
          )}

          {/* Upgrade button for non-pro org owners */}
          {isOrgOwner && orgPlan !== 'pro' && (
            <div className="sb-section" style={{marginTop:'auto'}}>
              <div style={{
                margin:'4px 0', padding:'11px 12px', borderRadius:10, cursor:'pointer',
                background:'linear-gradient(135deg,#F59E0B,#D97706)',
                display:'flex', alignItems:'center', gap:8,
                boxShadow:'0 4px 14px rgba(245,158,11,.3)',
              }} onClick={()=>nav('/pricing')}>
                <RiVipCrownLine size={16} color="#fff"/>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#fff'}}>Upgrade Plan</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.75)'}}>
                    {planKey==='trial'?'Unlock all features':'Go unlimited with Pro'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="sb-user">
          <div className="sb-user-card">
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sb-user-info">
              <div className="sb-user-name">{user?.name}</div>
              <div className="sb-user-email">{user?.email}</div>
              <div className="sb-user-role">{ROLE_LABEL[role]}</div>
            </div>
            <button className="sb-logout" onClick={doLogout} title="Sign out"><RiLogoutBoxLine size={18}/></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <span className="badge b-blue">{ROLE_LABEL[role]}</span>
            {orgName && <span className="badge b-gray">🏢 {orgName}</span>}
            <span className="badge" style={{
              background:planKey==='pro'?'#FEF3C7':'#F1F5F9',
              color:PLAN_COLOR[planKey], fontWeight:700,
            }}>
              ⭐ {planLabel.toUpperCase()}
            </span>
            {isOrgOwner && (
              <button className="btn btn-amber btn-sm" onClick={()=>nav('/pricing')} style={{fontSize:12}}>
                <RiVipCrownLine/> {planKey==='trial'?'Upgrade':'Manage Plan'}
              </button>
            )}
          </div>
        </div>
        <div className="page">{children}</div>
      </div>
    </div>
  )
}
