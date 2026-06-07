import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  RiSearchLine, RiUploadLine, RiDownloadLine, RiAddLine,
  RiSaveLine, RiCloseLine, RiEditLine, RiRefreshLine,
  RiAddCircleLine, RiCalendarLine, RiDeleteBinLine,
  RiSettings3Line, RiAlertLine,
} from 'react-icons/ri'
import GoogleSheetsModal from '../components/leads/GoogleSheetsModal'

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_BADGE  = { pending:'b-gray', in_progress:'b-blue', converted:'b-green', not_converted:'b-red' }
const STATUS_LABEL  = { pending:'Pending', in_progress:'In Progress', converted:'Converted', not_converted:'Not Converted' }
const OUTCOMES      = [{ k:'I',lbl:'Interested' },{ k:'NI',lbl:'Not Interested' },{ k:'CB',lbl:'Call Back' },{ k:'NA',lbl:'No Answer' }]

/* ─── Outcome button strip ───────────────────────────────── */
function OutcomeBtn({ value, onChange, disabled }) {
  return (
    <div className="outcome-row">
      {OUTCOMES.map(o => (
        <button key={o.k} type="button"
          className={`outcome-btn${value===o.k?' sel-'+o.k:''}`}
          onClick={() => !disabled && onChange(o.k)}
          disabled={disabled}
        >{o.lbl}</button>
      ))}
    </div>
  )
}

/* ─── Single call panel (view or edit) ───────────────────── */
function CallPanel({ label, call, onChange, canEdit, isOptional, enabled, showEnable, onEnable }) {
  if (isOptional && !enabled) {
    return showEnable
      ? <button className="btn btn-ghost btn-xs" onClick={onEnable}><RiAddCircleLine/> Add {label}</button>
      : <span className="muted fs11">—</span>
  }
  return (
    <div style={{ minWidth:148 }}>
      <div style={{ fontSize:9, fontWeight:800, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:.8 }}>{label}</div>
      {canEdit ? (
        <>
          <OutcomeBtn value={call?.outcome||''} onChange={v => onChange({ ...call, outcome:v })}/>
          <input type="date" className="ie" style={{ marginTop:5, width:'100%' }}
            value={call?.date ? String(call.date).substring(0,10) : ''}
            onChange={e => onChange({ ...call, date:e.target.value })}/>
          <input className="ie" style={{ marginTop:4 }} placeholder="Notes…"
            value={call?.notes||''} onChange={e => onChange({ ...call, notes:e.target.value })}/>
        </>
      ) : (
        <div>
          {call?.outcome
            ? <span className={`badge ${call.outcome==='I'?'b-green':call.outcome==='NI'?'b-red':call.outcome==='CB'?'b-amber':'b-gray'}`}>
                {OUTCOMES.find(o=>o.k===call.outcome)?.lbl}
              </span>
            : <span className="muted fs11">—</span>}
          {call?.date && <div className="fs11 muted">{new Date(call.date).toLocaleDateString()}</div>}
          {call?.doneBy?.name && <div className="fs11 muted">by {call.doneBy.name}</div>}
        </div>
      )}
    </div>
  )
}

/* ─── Add Column Modal ───────────────────────────────────── */
function AddColumnModal({ onClose, onSaved }) {
  const [label, setLabel] = useState('')
  const [type,  setType]  = useState('text')
  const [opts,  setOpts]  = useState('')   // comma-separated for select type
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!label.trim()) return toast.error('Column name is required')
    setLoading(true)
    try {
      const options = type === 'select' ? opts.split(',').map(o=>o.trim()).filter(Boolean) : []
      await axios.post('/api/leads/org-columns', { label: label.trim(), type, options })
      toast.success(`Column "${label}" added!`)
      onSaved()
      onClose()
    } catch(e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Add Custom Column</div>
            <div className="modal-sub">New column appears in all leads for your organization</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Column Name <span style={{color:'var(--danger)'}}>*</span></label>
            <input placeholder="e.g. City, Priority, Campaign Source" value={label} onChange={e=>setLabel(e.target.value)} autoFocus required/>
          </div>
          <div className="form-group">
            <label>Column Type</label>
            <select value={type} onChange={e=>setType(e.target.value)}>
              <option value="text">Text — free text input</option>
              <option value="number">Number — numeric value</option>
              <option value="select">Select — dropdown options</option>
            </select>
          </div>
          {type === 'select' && (
            <div className="form-group">
              <label>Options (comma-separated)</label>
              <input placeholder="Hot, Warm, Cold" value={opts} onChange={e=>setOpts(e.target.value)}/>
            </div>
          )}
          <div style={{ padding:'10px 12px', background:'#FEF9C3', borderRadius:8, fontSize:12, color:'#854D0E', marginBottom:12 }}>
            ⚠️ Custom columns are editable by all agents. Uploaded base columns (Name, Email, Contact, Address) remain locked.
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Adding…':'Add Column'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Manage Columns Modal ───────────────────────────────── */
function ManageColumnsModal({ columns, onClose, onRefresh }) {
  const [deleting, setDeleting] = useState(null)

  const deleteCol = async (key, label) => {
    if (!confirm(`Delete column "${label}"? All data in this column will be lost.`)) return
    setDeleting(key)
    try {
      await axios.delete(`/api/leads/org-columns/${key}`)
      toast.success(`Column "${label}" deleted`)
      onRefresh()
    } catch(e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setDeleting(null) }
  }

  const FIXED_COLS = ['Name','Email ID','Contact No','Address','Product','Service']

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:500 }}>
        <div className="modal-head">
          <div><div className="modal-title">Manage Columns</div><div className="modal-sub">View and remove custom columns</div></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:8 }}>FIXED COLUMNS (locked)</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {FIXED_COLS.map(c => (
              <span key={c} style={{ padding:'4px 10px', background:'#F0F4FB', borderRadius:6, fontSize:12, color:'var(--muted)', border:'1px solid var(--border)' }}>
                🔒 {c}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:8 }}>CUSTOM COLUMNS</div>
          {columns.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--muted)', fontSize:13 }}>
              No custom columns yet. Add one using the "+ Add Column" button.
            </div>
          )}
          {columns.map(col => (
            <div key={col.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:9, border:'1px solid var(--border)', marginBottom:8, background:'var(--surface)' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{col.label}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Type: {col.type} {col.options?.length ? `· Options: ${col.options.join(', ')}` : ''}</div>
              </div>
              <button className="btn btn-danger btn-xs" onClick={() => deleteCol(col.key, col.label)} disabled={deleting===col.key}>
                {deleting===col.key ? '…' : <RiDeleteBinLine/>}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Follow-up Schedule Modal (org_owner only) ──────────── */
function FollowUpModal({ lead, onClose, onSaved }) {
  const [date, setDate] = useState(lead.followUpDate ? String(lead.followUpDate).substring(0,10) : '')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Quick-set helpers
  const setDaysFromNow = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days)
    setDate(d.toISOString().substring(0,10))
  }

  const submit = async () => {
    setLoading(true)
    try {
      await axios.put(`/api/leads/${lead._id}`, { followUpDate: date || null })
      toast.success(`Follow-up scheduled for ${date ? new Date(date).toLocaleDateString() : 'cleared'}`)
      onSaved(); onClose()
    } catch(e) { toast.error('Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:400 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">📅 Schedule Follow-up</div>
            <div className="modal-sub">{lead.name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* C1 call summary — so owner can decide follow-up */}
        {lead.c1?.outcome && (
          <div style={{ background:'var(--bg)', borderRadius:9, padding:'10px 13px', marginBottom:14, fontSize:12 }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>C1 Call Result:</div>
            <span className={`badge ${lead.c1.outcome==='I'?'b-green':lead.c1.outcome==='NI'?'b-red':lead.c1.outcome==='CB'?'b-amber':'b-gray'}`}>
              {OUTCOMES.find(o=>o.k===lead.c1.outcome)?.lbl}
            </span>
            {lead.c1.date && <span style={{ marginLeft:8, color:'var(--muted)' }}>{new Date(lead.c1.date).toLocaleDateString()}</span>}
            {lead.c1.notes && <div style={{ marginTop:4, color:'var(--muted)' }}>{lead.c1.notes}</div>}
          </div>
        )}

        {/* Quick select buttons */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:8 }}>Quick Schedule:</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[{ d:1,lbl:'Tomorrow' },{ d:2,lbl:'2 Days' },{ d:3,lbl:'3 Days' },{ d:7,lbl:'1 Week' },{ d:14,lbl:'2 Weeks' },{ d:30,lbl:'1 Month' }].map(q => (
              <button key={q.d} className="btn btn-ghost btn-xs" onClick={() => setDaysFromNow(q.d)}>{q.lbl}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Or pick a specific date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().substring(0,10)}/>
        </div>

        {date && (
          <div style={{ background:'#F0FBF7', border:'1px solid var(--success)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#065F46', marginBottom:12 }}>
            ✅ Follow-up set for <strong>{new Date(date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</strong>
          </div>
        )}

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => { setDate(''); submit(); }}>Clear Date</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading||!date}>{loading?'Saving…':'Schedule'}</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main LeadsPage ─────────────────────────────────────── */
export default function LeadsPage() {
  const { canUpload, canDownload, canSetFollowUp, canManage, isAgent, user } = useAuth()
  const [leads, setLeads]         = useState([])
  const [total, setTotal]         = useState(0)
  const [page,  setPage]          = useState(1)
  const [pages, setPages]         = useState(1)
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState(null)
  const [editData, setEditData]   = useState({})
  const [saving,  setSaving]      = useState(false)
  const [customCols, setCustomCols] = useState([])

  // Modals
  const [showAdd,     setShowAdd]     = useState(false)
  const [showUpload,  setShowUpload]  = useState(false)
  const [showSheets,  setShowSheets]  = useState(false)
  const [showAddCol,  setShowAddCol]  = useState(false)
  const [showManCols, setShowManCols] = useState(false)
  const [followUpLead, setFollowUpLead] = useState(null)

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const role = user?.role || ''
  const canEditC1    = ['c1','ops_lead','ops_manager','org_owner','super_admin'].includes(role)
  const canEditC2    = ['c2','ops_lead','ops_manager','org_owner','super_admin'].includes(role)
  const canEditC3    = ['c3','ops_lead','ops_manager','org_owner','super_admin'].includes(role)
  const canEnableOpt = ['ops_manager','org_owner','super_admin'].includes(role)
  const canWork      = canEditC1 || canEditC2 || canEditC3

  /* Load custom columns */
  const loadCustomCols = useCallback(async () => {
    if (!canManage) return
    try { const {data} = await axios.get('/api/leads/org-columns'); setCustomCols(data.customColumns||[]) }
    catch(e) {}
  }, [canManage])

  /* Fetch leads */
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const {data} = await axios.get('/api/leads', { params:{ page, limit:15, search, status:statusF } })
      setLeads(data.leads); setTotal(data.total); setPages(data.pages)
    } catch { toast.error('Failed to load leads') }
    finally { setLoading(false) }
  }, [page, statusF, search])

  useEffect(() => { fetchLeads(); loadCustomCols() }, [page, statusF])
  useEffect(() => { const t = setTimeout(fetchLeads, 400); return () => clearTimeout(t) }, [search])

  /* Edit */
  const startEdit = l => {
    setEditId(l._id)
    setEditData({
      c1:{ outcome:l.c1?.outcome||'', date:l.c1?.date?String(l.c1.date).substring(0,10):'', notes:l.c1?.notes||'' },
      c2:{ outcome:l.c2?.outcome||'', date:l.c2?.date?String(l.c2.date).substring(0,10):'', notes:l.c2?.notes||'' },
      c3:{ outcome:l.c3?.outcome||'', date:l.c3?.date?String(l.c3.date).substring(0,10):'', notes:l.c3?.notes||'' },
      c2Enabled: l.c2Enabled,
      c3Enabled: l.c3Enabled,
      product:   l.product||'',
      service:   l.service||'',
      customData:{ ...(l.customData||{}) },
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/leads/${editId}`, editData)
      toast.success('Saved!')
      setEditId(null)
      fetchLeads()
    } catch(e) { toast.error(e.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const enableOpt = async (id, field) => {
    try { await axios.put(`/api/leads/${id}`, { [field]:true }); fetchLeads() }
    catch { toast.error('Failed') }
  }

  /* Download */
  const doDownload = async () => {
    try {
      const res = await axios.get('/api/leads/download', { responseType:'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href=url; a.download='leads.xlsx'; a.click()
      toast.success('Downloaded!')
    } catch { toast.error('Download failed') }
  }

  /* Upload */
  const doUpload = async file => {
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    setUploading(true)
    try {
      const {data} = await axios.post('/api/leads/upload', fd, { headers:{'Content-Type':'multipart/form-data'} })
      toast.success(`${data.count} leads imported!`); setShowUpload(false); fetchLeads()
    } catch(e) { toast.error(e.response?.data?.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-wrap">
          <RiSearchLine/>
          <input placeholder="Search name, email, contact…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="btn btn-ghost btn-sm" value={statusF} onChange={e=>setStatusF(e.target.value)} style={{cursor:'pointer'}}>
          <option value="">All Status</option>
          {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-icon" onClick={fetchLeads} title="Refresh"><RiRefreshLine/></button>

        {/* Column management — org_owner / ops_manager */}
        {canManage && (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddCol(true)}>
              <RiAddLine/> Add Column
            </button>
            <button className="btn-icon" onClick={() => setShowManCols(true)} title="Manage columns">
              <RiSettings3Line/>
            </button>
          </>
        )}

        {canUpload && (
          <>
            <button className="btn btn-sm" style={{background:'linear-gradient(135deg,#4285F4,#34A853)',color:'#fff',border:'none'}} onClick={() => setShowSheets(true)}>
              📊 Google Sheets
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(true)}>
              <RiUploadLine/> Upload Excel
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <RiAddLine/> Add Lead
            </button>
          </>
        )}
        {canDownload && (
          <button className="btn btn-success btn-sm" onClick={doDownload}>
            <RiDownloadLine/> Export
          </button>
        )}
      </div>

      {/* Count row + duplicate legend */}
      <div style={{display:'flex', gap:16, fontSize:12, color:'var(--muted)', alignItems:'center'}}>
        <span>Total: <strong style={{color:'var(--text)'}}>{total}</strong></span>
        <span>Page <strong style={{color:'var(--text)'}}>{page}/{pages}</strong></span>
        <span style={{display:'flex',alignItems:'center',gap:5}}>
          <span style={{width:10,height:10,borderRadius:2,background:'#FEE2E2',border:'1px solid #FCA5A5',display:'inline-block'}}/>
          Red row = Duplicate contact number
        </span>
      </div>

      {/* ── Table ── */}
      <div className="tbl-wrap" style={{flex:1}}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email ID</th>
              <th>Contact</th>
              <th>Product</th>
              <th>Service</th>
              {/* Dynamic custom columns */}
              {customCols.map(col => <th key={col.key}>{col.label}</th>)}
              <th>C1 Call</th>
              <th>C2 Call</th>
              <th>C3 Call</th>
              <th>Follow-up</th>
              <th>Status</th>
              <th>Last Worked By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={14+customCols.length} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Loading…</td></tr>
            )}
            {!loading && !leads.length && (
              <tr><td colSpan={14+customCols.length}>
                <div className="empty">
                  <div className="empty-icon">👥</div>
                  <h3>No leads found</h3>
                  <p>Upload Excel, Google Sheets or add manually</p>
                </div>
              </td></tr>
            )}

            {leads.map((l, i) => {
              const isEditing = editId === l._id
              const ed = editData
              const isDup = l.isDuplicate

              return (
                <tr key={l._id} style={{
                  background: isDup ? '#FEF2F2' : undefined,
                  outline:    isDup ? '1.5px solid #FCA5A5' : undefined,
                }}>
                  <td className="muted mono fs11">
                    {isDup && <RiAlertLine style={{color:'#EF4444',marginRight:3,verticalAlign:'middle'}}/>}
                    {(page-1)*15+i+1}
                  </td>

                  {/* LOCKED — name + address */}
                  <td>
                    <strong style={{fontSize:13}}>{l.name}</strong>
                    {l.address && <div className="muted fs11">{l.address}</div>}
                  </td>

                  {/* LOCKED — email */}
                  <td className="fs11" style={{color:isDup?'#991B1B':'var(--muted)'}}>{l.emailId||'—'}</td>

                  {/* LOCKED — contact (red if duplicate) */}
                  <td className="mono fs11" style={{color:isDup?'#EF4444':'inherit',fontWeight:isDup?700:400}}>
                    {l.contactNo||'—'}
                    {isDup && <div style={{fontSize:9,color:'#EF4444',fontWeight:700}}>DUPLICATE</div>}
                  </td>

                  {/* Product — editable */}
                  <td>
                    {isEditing
                      ? <input className="ie" style={{width:90}} value={ed.product} onChange={e=>setEditData(d=>({...d,product:e.target.value}))} placeholder="Product…"/>
                      : <span style={{fontSize:12}}>{l.product||'—'}</span>}
                  </td>

                  {/* Service — editable */}
                  <td>
                    {isEditing
                      ? <input className="ie" style={{width:90}} value={ed.service} onChange={e=>setEditData(d=>({...d,service:e.target.value}))} placeholder="Service…"/>
                      : <span style={{fontSize:12}}>{l.service||'—'}</span>}
                  </td>

                  {/* Custom columns — editable */}
                  {customCols.map(col => (
                    <td key={col.key}>
                      {isEditing ? (
                        col.type === 'select' ? (
                          <select className="ie" style={{width:100}}
                            value={ed.customData?.[col.key]||''}
                            onChange={e=>setEditData(d=>({...d,customData:{...d.customData,[col.key]:e.target.value}}))}>
                            <option value="">—</option>
                            {(col.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input className="ie" style={{width:90}} type={col.type==='number'?'number':'text'}
                            value={ed.customData?.[col.key]||''}
                            onChange={e=>setEditData(d=>({...d,customData:{...d.customData,[col.key]:e.target.value}}))}
                            placeholder={col.label+'…'}/>
                        )
                      ) : (
                        <span style={{fontSize:12}}>{l.customData?.[col.key]||'—'}</span>
                      )}
                    </td>
                  ))}

                  {/* C1 call */}
                  <td>
                    {isEditing && canEditC1
                      ? <CallPanel label="C1" call={ed.c1} onChange={v=>setEditData(d=>({...d,c1:v}))} canEdit/>
                      : <CallPanel label="C1" call={l.c1} canEdit={false}/>}
                  </td>

                  {/* C2 — optional */}
                  <td>
                    {isEditing && canEditC2
                      ? <CallPanel label="C2" call={ed.c2} onChange={v=>setEditData(d=>({...d,c2:v}))} canEdit
                          isOptional enabled={ed.c2Enabled}
                          showEnable={!ed.c2Enabled && canEnableOpt}
                          onEnable={()=>setEditData(d=>({...d,c2Enabled:true}))}/>
                      : <CallPanel label="C2" call={l.c2} canEdit={false}
                          isOptional enabled={l.c2Enabled}
                          showEnable={!l.c2Enabled && canEnableOpt}
                          onEnable={()=>enableOpt(l._id,'c2Enabled')}/>}
                  </td>

                  {/* C3 — optional */}
                  <td>
                    {isEditing && canEditC3
                      ? <CallPanel label="C3" call={ed.c3} onChange={v=>setEditData(d=>({...d,c3:v}))} canEdit
                          isOptional enabled={ed.c3Enabled}
                          showEnable={!ed.c3Enabled && canEnableOpt}
                          onEnable={()=>setEditData(d=>({...d,c3Enabled:true}))}/>
                      : <CallPanel label="C3" call={l.c3} canEdit={false}
                          isOptional enabled={l.c3Enabled}
                          showEnable={!l.c3Enabled && canEnableOpt}
                          onEnable={()=>enableOpt(l._id,'c3Enabled')}/>}
                  </td>

                  {/* Follow-up date — org_owner schedules */}
                  <td>
                    {canSetFollowUp ? (
                      <button className="btn btn-ghost btn-xs" onClick={() => setFollowUpLead(l)} title="Schedule follow-up"
                        style={{color:l.followUpDate?'var(--success)':'var(--muted)'}}>
                        <RiCalendarLine/>
                        {l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : 'Set'}
                      </button>
                    ) : (
                      l.followUpDate
                        ? <span style={{fontSize:11}}><RiCalendarLine style={{marginRight:3}}/>{new Date(l.followUpDate).toLocaleDateString()}</span>
                        : <span className="muted fs11">—</span>
                    )}
                  </td>

                  {/* Status — auto from call logic */}
                  <td>
                    <span className={`badge ${STATUS_BADGE[l.status]||'b-gray'}`}>
                      {STATUS_LABEL[l.status]||l.status}
                    </span>
                    {/* Auto-optimize badge: C1==C2 */}
                    {l.c2Enabled && l.c1?.outcome && l.c2?.outcome && l.c1.outcome===l.c2.outcome && (
                      <div style={{fontSize:9,color:'#7C3AED',marginTop:2,fontWeight:700}}>⚡ C1=C2 Auto</div>
                    )}
                  </td>

                  {/* Last worked by */}
                  <td>
                    {l.lastWorkedBy
                      ? <div>
                          <div style={{fontSize:12,fontWeight:600}}>{l.lastWorkedBy.name}</div>
                          <div className="muted fs11">{l.lastWorkedAt?new Date(l.lastWorkedAt).toLocaleDateString():''}</div>
                        </div>
                      : <span className="muted fs11">—</span>}
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      {isEditing ? (
                        <>
                          <button className="btn btn-success btn-xs" onClick={save} disabled={saving}>
                            {saving ? '…' : <RiSaveLine/>}
                          </button>
                          <button className="btn-icon" style={{fontSize:13}} onClick={()=>setEditId(null)}>
                            <RiCloseLine/>
                          </button>
                        </>
                      ) : canWork && (
                        <button className="btn-icon" onClick={()=>startEdit(l)} title="Edit calls">
                          <RiEditLine/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="pg" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
          {Array.from({length:Math.min(pages,7)},(_,i)=>(
            <button key={i+1} className={`pg${page===i+1?' on':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
          <button className="pg" onClick={()=>setPage(p=>p+1)} disabled={page===pages}>›</button>
        </div>
      )}

      {/* ── Modals ── */}
      {showSheets && <GoogleSheetsModal onClose={()=>setShowSheets(false)} onImported={fetchLeads}/>}

      {showAddCol  && <AddColumnModal    onClose={()=>setShowAddCol(false)}  onSaved={()=>{loadCustomCols();fetchLeads()}}/>}
      {showManCols && <ManageColumnsModal columns={customCols} onClose={()=>setShowManCols(false)} onRefresh={()=>{loadCustomCols();fetchLeads()}}/>}
      {followUpLead && <FollowUpModal lead={followUpLead} onClose={()=>setFollowUpLead(null)} onSaved={fetchLeads}/>}

      {showUpload && (
        <div className="overlay" onClick={()=>setShowUpload(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div><div className="modal-title">Upload Excel / CSV</div><div className="modal-sub">Columns: Name, Address, Email, Contact, Product, Service + any custom columns</div></div>
              <button className="modal-close" onClick={()=>setShowUpload(false)}>×</button>
            </div>
            <div className="upload-zone" onClick={()=>fileRef.current.click()}
              onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();doUpload(e.dataTransfer.files[0])}}>
              <div className="upload-icon">📊</div>
              <h4>Click or drag & drop here</h4>
              <p>Supports .xlsx .xls .csv — max 10MB</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>doUpload(e.target.files[0])}/>
            </div>
            {uploading && <p style={{textAlign:'center',marginTop:12,color:'var(--muted)'}}>Uploading…</p>}
            {customCols.length > 0 && (
              <div className="auth-info" style={{marginTop:12}}>
                <strong>Custom columns detected:</strong> {customCols.map(c=>c.label).join(', ')}<br/>
                Include these as column headers in your Excel to auto-import their values.
              </div>
            )}
            <div className="auth-info" style={{marginTop:8}}>
              <strong>Locked after import:</strong> Name, Email, Address, Contact are permanently locked.
              Product, Service, and custom columns remain editable.
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddLeadModal onClose={()=>setShowAdd(false)} onSaved={fetchLeads} customCols={customCols}/>}
    </>
  )
}

/* ─── Add Lead Modal (with custom cols) ─────────────────── */
function AddLeadModal({ onClose, onSaved, customCols }) {
  const [f, setF]         = useState({ name:'', address:'', emailId:'', contactNo:'', product:'', service:'', customData:{} })
  const [loading, setLoading] = useState(false)
  const set = k => e => setF(p => ({...p,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault()
    if (!f.name) return toast.error('Name is required')
    setLoading(true)
    try {
      await axios.post('/api/leads', f)
      toast.success('Lead added!')
      onSaved(); onClose()
    } catch(err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Add New Lead</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input placeholder="John Smith" value={f.name} onChange={set('name')} required/></div>
            <div className="form-group"><label>Contact No</label><input placeholder="9876543210" value={f.contactNo} onChange={set('contactNo')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email ID</label><input type="email" value={f.emailId} onChange={set('emailId')}/></div>
            <div className="form-group"><label>Address</label><input value={f.address} onChange={set('address')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Product</label><input placeholder="e.g. Insurance Plan A" value={f.product} onChange={set('product')}/></div>
            <div className="form-group"><label>Service</label><input placeholder="e.g. Health Cover" value={f.service} onChange={set('service')}/></div>
          </div>
          {/* Custom columns */}
          {customCols.length > 0 && (
            <>
              <div style={{borderTop:'1px solid var(--border)',margin:'10px 0 14px',paddingTop:12}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:10}}>CUSTOM COLUMNS</div>
                <div className="form-row" style={{flexWrap:'wrap'}}>
                  {customCols.map(col => (
                    <div key={col.key} className="form-group">
                      <label>{col.label}</label>
                      {col.type==='select' ? (
                        <select value={f.customData[col.key]||''} onChange={e=>setF(p=>({...p,customData:{...p.customData,[col.key]:e.target.value}}))}>
                          <option value="">— select —</option>
                          {(col.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={col.type==='number'?'number':'text'} placeholder={col.label}
                          value={f.customData[col.key]||''} onChange={e=>setF(p=>({...p,customData:{...p.customData,[col.key]:e.target.value}}))}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Adding…':'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
