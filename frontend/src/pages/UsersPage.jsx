import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { RiAddLine, RiUserLine, RiShieldCheckLine, RiVipCrownLine } from 'react-icons/ri'

const ROLES_ALL   = ['c1','c2','c3','ops_lead','ops_manager','sub_business_owner']
const AGENT_ROLES = ['c1','c2','c3']
const ROLE_LABEL  = { super_admin:'Super Admin', org_owner:'Business Owner', sub_business_owner:'Sub Business Owner', ops_manager:'Ops Manager', ops_lead:'Ops Lead', c1:'C1 Agent', c2:'C2 Agent', c3:'C3 Agent' }
const ROLE_BADGE  = { super_admin:'b-red', org_owner:'b-purple', sub_business_owner:'b-purple', ops_manager:'b-amber', ops_lead:'b-blue', c1:'b-navy', c2:'b-navy', c3:'b-navy' }
const PLAN_COLOR  = { free:'#94A3B8', pro:'#F59E0B' }

const PERMS = {
  org_owner:   ['Upload data','Download data','Full team management','All reports','Set follow-up dates','Manage subscription'],
  sub_business_owner: ['Upload data','Download data','Full team management','All reports','Set follow-up dates','Manage subscription'],
  ops_manager: ['View dashboard','Download data','Share reports','Assign agent roles','Manage C1/C2/C3'],
  ops_lead:    ['View dashboard','Cannot download','View reports only'],
  c1:          ['C1 call only','No dashboard'],
  c2:          ['C2 call only','No dashboard'],
  c3:          ['C3 call only','No dashboard'],
}

export default function UsersPage() {
  const { user, isOrgOwner, isBusinessOwner, isOpsManager, isSuperAdmin } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [org,     setOrg]     = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const [ur, or] = await Promise.all([
        axios.get('/api/auth/users'),
        isOrgOwner ? axios.get('/api/auth/org') : Promise.resolve(null),
      ])
      setUsers(ur.data.users)
      console.log(ur.data.users)
      if (or) setOrg(or.data.org)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchUsers() }, [])

  const changeRole = async (u, role) => {
    try { await axios.put(`/api/auth/users/${u._id}`, { role, isActive:u.isActive }); toast.success('Role updated'); fetchUsers() }
    catch(e) { toast.error(e.response?.data?.message || 'Failed') }
  }
  const toggleActive = async (u) => {
    try { await axios.put(`/api/auth/users/${u._id}`, { role:u.role, isActive:!u.isActive }); toast.success(u.isActive?'Deactivated':'Activated'); fetchUsers() }
    catch { toast.error('Failed') }
  }
  const changePlan = async (plan) => {
    try { await axios.put('/api/auth/org', { plan }); toast.success(`Plan updated to ${plan}`); fetchUsers() }
    catch { toast.error('Failed') }
  }

  const roleCounts = ROLES_ALL.reduce((a,r) => ({ ...a, [r]: users.filter(u=>u.role===r).length }), {})
  const currentRole = user?.role || ''
  const canManageTarget = (u) => {
    if (!u) return false
    if (u._id === user?._id) return false
    if (isSuperAdmin) return u.role !== 'super_admin'
    if (isBusinessOwner) return !['super_admin','org_owner'].includes(u.role)
    if (currentRole === 'sub_business_owner') return !['org_owner','sub_business_owner'].includes(u.role)
    if (isOpsManager) return ['c1','c2','c3'].includes(u.role)
    return false
  }
  const editableRoles = isOpsManager ? AGENT_ROLES : (isSuperAdmin || isBusinessOwner ? ROLES_ALL : ROLES_ALL.filter(r => r !== 'sub_business_owner'))

  return (
    <>
      {/* Stats */}
      <div className="grid4" style={{ gap:10 }}>
        {[
          { lbl:'Total Team', val:users.length,              cls:'si-blue'  },
          { lbl:'Ops Managers',val:roleCounts.ops_manager||0,cls:'si-amber' },
          { lbl:'Ops Leads',  val:roleCounts.ops_lead||0,   cls:'si-navy'  },
          { lbl:'Sub Owners', val:roleCounts.sub_business_owner||0, cls:'si-purple' },
          { lbl:'Agents',     val:(roleCounts.c1||0)+(roleCounts.c2||0)+(roleCounts.c3||0), cls:'si-green' },
        ].map(s => (
          <div key={s.lbl} className="card">
            <div className="stat">
              <div className={`stat-icon ${s.cls}`}><RiUserLine/></div>
              <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ flex:1, minHeight:0 }}>
        {/* Table */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Team Members</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><RiAddLine/> Add Member</button>
          </div>

          <div className="tbl-wrap" style={{ flex:1 }}>
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Added By</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign:'center', padding:24, color:'var(--muted)' }}>Loading…</td></tr>}
                {!loading && !users.length && (
                  <tr><td colSpan={8}><div className="empty"><div className="empty-icon">👤</div><h3>No members yet</h3></div></td></tr>
                )}
                {users.map((u,i) => (
                  <tr key={u._id}>
                    <td className="muted fs11">{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="avatar" style={{ width:26, height:26, fontSize:11 }}>{u.name?.[0]?.toUpperCase()}</div>
                        <strong style={{ fontSize:13 }}>{u.name}</strong>
                      </div>
                    </td>
                    <td className="muted fs11">{u.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]||'b-gray'}`}>{ROLE_LABEL[u.role]}</span></td>
                    <td className="muted fs11">{u.createdBy?.name || 'System'}</td>
                    <td className="muted fs11">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td><span className={`badge ${u.isActive?'b-green':'b-red'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                    <td>
                      {canManageTarget(u) && (
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                            style={{ padding:'4px 8px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:11, fontFamily:'Outfit,sans-serif', cursor:'pointer', background:'var(--surface)' }}>
                            {editableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                          {isOrgOwner && (
                            <button className={`btn btn-xs ${u.isActive?'btn-danger':'btn-success'}`} onClick={() => toggleActive(u)}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:180, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
          

          {/* Role permissions */}
          <div className="card scroll-y" style={{ flex:1 }}>
            <div className="card-title" style={{ marginBottom:12 }}><RiShieldCheckLine style={{ marginRight:6 }}/>Permissions</div>
            {Object.entries(PERMS).map(([r, perms]) => (
              <div key={r} style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
                <span className={`badge ${ROLE_BADGE[r]||'b-gray'}`} style={{ marginBottom:6 }}>{ROLE_LABEL[r]}</span>
                {perms.map(p => (
                  <div key={p} style={{ fontSize:10, color:'var(--muted)', display:'flex', gap:4, marginBottom:2 }}>
                    <span style={{ color:'var(--success)', fontWeight:700 }}>✓</span> {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={fetchUsers} isBusinessOwner={isBusinessOwner} isSuperAdmin={isSuperAdmin} />}
    </>
  )
}

function AddModal({ onClose, onSaved, isBusinessOwner, isSuperAdmin }) {
  const [f, setF] = useState({ name:'', email:'', password:'', phone:'', role:'c1' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setF(p => ({ ...p, [k]:e.target.value }))
  const canAssignOwnerLike = isBusinessOwner || isSuperAdmin
  const availableRoles = canAssignOwnerLike ? ['c1','c2','c3','ops_lead','ops_manager','sub_business_owner'] : ['c1','c2','c3']
  const ROLE_LABEL = { sub_business_owner:'Sub Business Owner', ops_manager:'Ops Manager', ops_lead:'Ops Lead', c1:'C1 Agent', c2:'C2 Agent', c3:'C3 Agent' }

  const submit = async e => {
    e.preventDefault()
    if (f.password.length < 6) return toast.error('Password min 6 chars')
    setLoading(true)
    try { await axios.post('/api/auth/register', f); toast.success('Member added!'); onSaved(); onClose() }
    catch(err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-title">Add Team Member</div><div className="modal-sub">Added to your organization</div></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input placeholder="Agent Name" value={f.name} onChange={set('name')} required/></div>
            <div className="form-group"><label>Phone</label><input placeholder="+91 98765 43210" value={f.phone} onChange={set('phone')}/></div>
          </div>
          <div className="form-group"><label>Email *</label><input type="email" value={f.email} onChange={set('email')} required/></div>
          <div className="form-group"><label>Password *</label><input type="password" placeholder="Min 6 chars" value={f.password} onChange={set('password')} required/></div>
          <div className="form-group">
            <label>Role *</label>
            <select value={f.role} onChange={set('role')}>
              {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="auth-info" style={{ marginBottom:10, fontSize:11 }}>
            <strong>C1/C2/C3:</strong> Calling agents — no dashboard access<br/>
            <strong>Ops Lead:</strong> View dashboard, cannot download<br/>
            <strong>Ops Manager:</strong> Download + assign agent roles<br/>
            <strong>Sub Business Owner:</strong> Full owner-like access for the organization
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Adding…':'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
