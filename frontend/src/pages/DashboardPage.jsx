import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useAuth } from '../context/AuthContext'
import { RiUserAddLine, RiCheckLine, RiPhoneLine, RiBarChartLine, RiTimeLine, RiUploadLine, RiCloseCircleLine } from 'react-icons/ri'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const timeAgo = d => {
  const s = Math.floor((Date.now()-new Date(d))/1000)
  if(s<60) return `${s}s ago`; if(s<3600) return `${Math.floor(s/60)}m ago`
  if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ACT_COLOR = { login:'b-blue', upload:'b-green', download:'b-amber', update:'b-blue', create:'b-green', delete:'b-red' }

export default function DashboardPage() {
  const { user, canUpload, canDownload } = useAuth()
  const [data, setData] = useState(null)
  const [acts, setActs] = useState([])
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [a,b] = await Promise.all([axios.get(`/api/leads/analytics?period=${period}`), axios.get('/api/leads/activities')])
      setData(a.data.analytics); setActs(b.data.activities)
    } catch(e) {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [period])

  if (loading) return <div className="loading"><div className="spinner"/></div>
  const a = data || {}

  const barData = {
    labels: (a.monthlyUploads||[]).map(m => MONTHS[m._id.m-1]),
    datasets:[{ label:'Uploads', data:(a.monthlyUploads||[]).map(m=>m.count), backgroundColor:'#3B6FFF', borderRadius:6, borderSkipped:false }]
  }
  const barOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{ y:{grid:{color:'#F0F4FB'},ticks:{font:{family:'Outfit',size:11}}}, x:{grid:{display:false},ticks:{font:{family:'Outfit',size:11}}} } }

  const donutData = {
    labels:['Pending','In Progress','Converted','Not Converted'],
    datasets:[{ data:[a.pending||0,a.inProgress||0,a.converted||0,a.notConverted||0],
      backgroundColor:['#94A3B8','#3B6FFF','#00C48C','#FF4757'], borderWidth:0 }]
  }
  const donutOpts = { responsive:true, maintainAspectRatio:false, cutout:'68%',
    plugins:{ legend:{ position:'bottom', labels:{ font:{family:'Outfit',size:11}, padding:10, boxWidth:10 } } } }

  return (
    <>
      {/* Greeting */}
      <div>
        <h2 style={{ fontFamily:'Outfit,sans-serif', fontSize:21, fontWeight:800, letterSpacing:'-.3px' }}>
          Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>Here's your leads overview.</p>
      </div>

      {/* Stats */}
      <div className="grid4">
        {[
          { icon:<RiUserAddLine/>,      cls:'si-blue',  val:a.total||0,        lbl:'Total Leads' },
          { icon:<RiTimeLine/>,         cls:'si-amber',  val:a.pending||0,      lbl:'Pending' },
          { icon:<RiPhoneLine/>,        cls:'si-navy',   val:a.inProgress||0,   lbl:'In Progress' },
          { icon:<RiCheckLine/>,        cls:'si-green',  val:a.converted||0,    lbl:'Converted' },
        ].map((s,i) => (
          <div className="card" key={i}>
            <div className="stat">
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row" style={{ alignItems:'flex-start' }}>
        <div className="card col">
          <div className="card-header" style={{ marginBottom:10 }}>
            <div><div className="card-title">Upload Trend</div><div className="card-sub">Lead uploads over time</div></div>
            <div className="period-tabs">
              {['week','month','quarter','half','year'].map(p => (
                <button key={p} className={`period-tab${period===p?' active':''}`} onClick={() => setPeriod(p)}>
                  {p==='week'?'Week':p==='month'?'Month':p==='quarter'?'Q':p==='half'?'H1':'Year'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height:170 }}><Bar data={barData} options={barOpts}/></div>
        </div>
        <div className="card" style={{ width:210, flexShrink:0 }}>
          <div className="card-header" style={{ marginBottom:8 }}><div className="card-title">Status Mix</div></div>
          <div style={{ height:170 }}><Doughnut data={donutData} options={donutOpts}/></div>
        </div>
      </div>

      {/* Bottom */}
      <div className="row" style={{ flex:1, minHeight:0 }}>
        <div className="card col scroll-y">
          <div className="card-header"><div className="card-title">Recent Activity</div></div>
          {acts.slice(0,12).map((act,i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:7,height:7,borderRadius:'50%',marginTop:5,flexShrink:0,
                background:act.action==='upload'?'var(--success)':act.action==='download'?'var(--warning)':act.action==='delete'?'var(--danger)':'var(--primary)'}}/>
              <div>
                <div style={{ fontSize:12 }}><strong>{act.user?.name}</strong> — {act.description}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{timeAgo(act.createdAt)}</div>
              </div>
            </div>
          ))}
          {!acts.length && <div className="empty"><div className="empty-icon">📋</div><p>No activities yet</p></div>}
        </div>

        <div style={{ width:190, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom:10, fontSize:13 }}>Not Converted</div>
            <div style={{ fontSize:28, fontWeight:900, fontFamily:'Outfit,sans-serif', color:'var(--danger)' }}>{a.notConverted||0}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>leads marked Not Converted</div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom:10, fontSize:13 }}>Quick Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {canUpload && <a href="/leads" className="btn btn-primary btn-sm"><RiUploadLine/> Upload Data</a>}
              {canDownload && <button className="btn btn-success btn-sm" onClick={() => window.open('/api/leads/download')}>📥 Export Excel</button>}
              <a href="/reports" className="btn btn-ghost btn-sm"><RiBarChartLine/> View Reports</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
