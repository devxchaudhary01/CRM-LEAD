import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { RiCheckLine, RiArrowRightLine, RiArrowLeftLine, RiRefreshLine, RiDownloadLine, RiLinkM, RiEyeLine } from 'react-icons/ri'

const CRM_FIELDS = [
  { key:'name',      label:'Name',       required:true,  hint:'Full name of the lead'     },
  { key:'contactNo', label:'Contact No', required:false, hint:'Phone / mobile number'     },
  { key:'emailId',   label:'Email ID',   required:false, hint:'Email address'              },
  { key:'address',   label:'Address',    required:false, hint:'City / address / location'  },
  { key:'product',   label:'Product',    required:false, hint:'Product name or category'   },
  { key:'service',   label:'Service',    required:false, hint:'Service type or description' },
]

const STEPS = [
  { num:1, label:'Paste Link'     },
  { num:2, label:'Select Columns' },
  { num:3, label:'Map & Import'   },
]

function StepBar({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
      {STEPS.map((s,i) => (
        <React.Fragment key={s.num}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:800, flexShrink:0, transition:'all .2s',
              background: current>s.num?'var(--success)':current===s.num?'var(--primary)':'var(--bg)',
              color: current>=s.num?'#fff':'var(--muted)',
              border: current<s.num?'2px solid var(--border-2)':'none',
            }}>
              {current>s.num ? <RiCheckLine size={13}/> : s.num}
            </div>
            <span style={{ fontSize:12, fontWeight:current===s.num?700:400, color:current===s.num?'var(--text)':'var(--muted)', whiteSpace:'nowrap' }}>
              {s.label}
            </span>
          </div>
          {i<STEPS.length-1 && (
            <div style={{ flex:1, height:2, margin:'0 10px', background:current>s.num?'var(--success)':'var(--border)', transition:'background .3s' }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function GoogleSheetsModal({ onClose, onImported }) {
  const [step, setStep]           = useState(1)
  const [url, setUrl]             = useState('')
  const [fetching, setFetching]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [showSample, setShowSample] = useState(false)
  const [columns, setColumns]     = useState([])
  const [rowCount, setRowCount]   = useState(0)
  const [sheetId, setSheetId]     = useState('')
  const [gid, setGid]             = useState('0')
  const [sampleRows, setSampleRows] = useState([])
  const [selected, setSelected]   = useState({})
  const [mapping, setMapping]     = useState({ name:'', contactNo:'', emailId:'', address:'', product:'', service:'' })

  const handleFetch = async () => {
    const trimmed = url.trim()
    if (!trimmed) return toast.error('Please paste a Google Sheets link first')
    if (!trimmed.includes('docs.google.com/spreadsheets')) return toast.error('That does not look like a Google Sheets link')
    setFetching(true)
    try {
      const { data } = await axios.post('/api/sheets/preview', { url:trimmed })
      setColumns(data.columns); setRowCount(data.rowCount)
      setSheetId(data.sheetId); setGid(data.gid); setSampleRows(data.sampleRows||[])
      const sel={}; data.columns.forEach(c=>{sel[c]=true}); setSelected(sel)
      // Auto-map
      const auto={ name:'',contactNo:'',emailId:'',address:'',product:'',service:'' }
      data.columns.forEach(col => {
        const lo=col.toLowerCase()
        if(!auto.name      && lo.includes('name'))                                             auto.name=col
        if(!auto.contactNo && (lo.includes('phone')||lo.includes('mobile')||lo.includes('contact'))) auto.contactNo=col
        if(!auto.emailId   && lo.includes('email'))                                            auto.emailId=col
        if(!auto.address   && (lo.includes('address')||lo.includes('city')||lo.includes('location'))) auto.address=col
        if(!auto.product   && lo.includes('product'))                                          auto.product=col
        if(!auto.service   && lo.includes('service'))                                          auto.service=col
      })
      setMapping(auto)
      toast.success(`✅ Found ${data.columns.length} columns · ${data.rowCount} rows`)
      setStep(2)
    } catch(e) { toast.error(e.response?.data?.message || e.message) }
    finally { setFetching(false) }
  }

  const toggle   = col => setSelected(s=>({...s,[col]:!s[col]}))
  const selAll   = ()  => { const s={}; columns.forEach(c=>s[c]=true);  setSelected(s) }
  const clearAll = ()  => { const s={}; columns.forEach(c=>s[c]=false); setSelected(s) }
  const selectedCount = Object.values(selected).filter(Boolean).length

  const goToMap = () => {
    if (!selectedCount) return toast.error('Select at least one column')
    setMapping(m => {
      const next={...m}
      Object.keys(next).forEach(k=>{ if(next[k]&&!selected[next[k]]) next[k]='' })
      return next
    })
    setStep(3)
  }

  const handleImport = async () => {
    if (!mapping.name) return toast.error('Name column mapping is required')
    setImporting(true)
    try {
      const { data } = await axios.post('/api/sheets/import', { sheetId, gid, mapping })
      toast.success(data.message); onImported(); onClose()
    } catch(e) { toast.error(e.response?.data?.message || 'Import failed') }
    finally { setImporting(false) }
  }

  const selectedCols = columns.filter(c=>selected[c])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:600 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:22 }}>📊</span> Import from Google Sheets
            </div>
            <div className="modal-sub">Fetch leads directly from a public Google Sheet</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <StepBar current={step}/>

        {/* STEP 1 */}
        {step===1 && (
          <div>
            <div style={{ background:'#F0F7FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'12px 14px', marginBottom:18 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1D4ED8', marginBottom:8 }}>📋 Before pasting — set your sheet to public:</div>
              {['1. Open your Google Sheet','2. Click Share (top right)','3. Change to "Anyone with the link → Viewer"','4. Copy link and paste below'].map((t,i) => (
                <div key={i} style={{ fontSize:12, color:'#374151', padding:'2px 0' }}>{t}</div>
              ))}
            </div>
            <div className="form-group">
              <label>Google Sheets Link <span style={{ color:'var(--danger)' }}>*</span></label>
              <div style={{ display:'flex', gap:8 }}>
                <input placeholder="https://docs.google.com/spreadsheets/d/..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!fetching&&handleFetch()} style={{ flex:1, fontSize:13 }}/>
                <button className="btn btn-primary" onClick={handleFetch} disabled={fetching} style={{ flexShrink:0 }}>
                  {fetching ? <><RiRefreshLine style={{ animation:'spin .7s linear infinite' }}/> Fetching…</> : <><RiLinkM/> Fetch Columns</>}
                </button>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>Press Enter or click Fetch Columns</div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg)', borderRadius:9, padding:'10px 14px', marginBottom:14 }}>
              <div style={{ fontSize:13 }}>
                <strong style={{ color:'var(--primary)' }}>{columns.length}</strong> columns &nbsp;·&nbsp;
                <strong style={{ color:'var(--success)' }}>{rowCount}</strong> rows &nbsp;·&nbsp;
                <strong style={{ color:'var(--text)' }}>{selectedCount}</strong> selected
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-ghost btn-xs" onClick={clearAll}>Clear All</button>
                <button className="btn btn-outline btn-xs" onClick={selAll}>Select All</button>
                {sampleRows.length>0 && <button className="btn btn-ghost btn-xs" onClick={() => setShowSample(s=>!s)}><RiEyeLine/> {showSample?'Hide':'Preview'}</button>}
              </div>
            </div>

            {showSample && sampleRows.length>0 && (
              <div style={{ marginBottom:14, overflowX:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
                <table style={{ fontSize:11, minWidth:'100%' }}>
                  <thead>
                    <tr>{columns.map(col => (
                      <th key={col} style={{ padding:'7px 10px', background:'var(--bg)', textAlign:'left', whiteSpace:'nowrap', fontWeight:700, color:selected[col]?'var(--primary)':'var(--muted)', borderBottom:'1px solid var(--border)' }}>
                        {selected[col]?'✅ ':'⬜ '}{col}
                      </th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row,ri) => (
                      <tr key={ri}>{columns.map(col => (
                        <td key={col} style={{ padding:'6px 10px', borderBottom:'1px solid var(--border)', color:selected[col]?'var(--text)':'var(--muted)', opacity:selected[col]?1:0.4, whiteSpace:'nowrap' }}>
                          {row[col]||'—'}
                        </td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8, maxHeight:260, overflowY:'auto', paddingRight:4 }}>
              {columns.map((col,i) => (
                <div key={i} onClick={() => toggle(col)} style={{
                  display:'flex', alignItems:'center', gap:9, padding:'10px 12px', borderRadius:9, cursor:'pointer',
                  border:`1.5px solid ${selected[col]?'var(--primary)':'var(--border)'}`,
                  background:selected[col]?'var(--primary-l)':'var(--surface)', transition:'all .15s', userSelect:'none',
                }}>
                  <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s',
                    border:`2px solid ${selected[col]?'var(--primary)':'var(--border-2)'}`, background:selected[col]?'var(--primary)':'transparent' }}>
                    {selected[col] && <RiCheckLine size={11} color="#fff"/>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:selected[col]?600:400, color:selected[col]?'var(--primary)':'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {col}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setStep(1)}><RiArrowLeftLine/> Back</button>
              <button className="btn btn-primary" onClick={goToMap} disabled={!selectedCount}>Map Columns <RiArrowRightLine/></button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3 && (
          <div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              Match sheet columns to CRM fields. <strong style={{ color:'var(--danger)' }}>Name is required.</strong>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {CRM_FIELDS.map(field => {
                const isMapped = !!mapping[field.key]
                return (
                  <div key={field.key} style={{
                    display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'center', gap:14,
                    padding:'12px 14px', borderRadius:10, transition:'all .2s',
                    background:isMapped?'#F0FBF7':'var(--bg)',
                    border:`1.5px solid ${field.required?(isMapped?'var(--success)':'var(--danger)'):(isMapped?'var(--success)':'var(--border)')}`,
                  }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700 }}>
                        {field.required && <span style={{ color:'var(--danger)', marginRight:3 }}>*</span>}
                        {field.label}{isMapped&&<span style={{ color:'var(--success)', marginLeft:6, fontSize:12 }}>✓</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{field.hint}</div>
                    </div>
                    <select value={mapping[field.key]} onChange={e => setMapping(m=>({...m,[field.key]:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', border:`1.5px solid ${isMapped?'var(--success)':'var(--border)'}`, borderRadius:8, fontSize:13, fontFamily:'Outfit,sans-serif', background:'var(--surface)', cursor:'pointer' }}>
                      <option value="">— not mapped —</option>
                      {selectedCols.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:16, padding:'11px 14px', background:'var(--bg)', borderRadius:9, border:'1px solid var(--border)', fontSize:12 }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>📦 Import Summary</div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', color:'var(--muted)' }}>
                <span>📊 Rows: <strong style={{ color:'var(--text)' }}>{rowCount}</strong></span>
                <span>🗂 Selected cols: <strong style={{ color:'var(--text)' }}>{selectedCount}</strong></span>
                <span>🔗 Mapped: <strong style={{ color:'var(--text)' }}>{Object.values(mapping).filter(Boolean).length}/{CRM_FIELDS.length}</strong></span>
                <span>🔒 Locked after import</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setStep(2)}><RiArrowLeftLine/> Back</button>
              <button className="btn btn-success" onClick={handleImport} disabled={importing||!mapping.name}>
                {importing ? <><RiRefreshLine style={{ animation:'spin .7s linear infinite' }}/> Importing…</> : <><RiDownloadLine/> Import {rowCount} Leads</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
