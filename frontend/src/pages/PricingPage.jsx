// pages/PricingPage.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { RiCheckLine, RiCloseLine, RiVipCrownLine, RiArrowLeftLine } from 'react-icons/ri'

const PLANS = [
  {
    key:     'trial',
    name:    'Trial pack',
    price:   0,
    period:  '',
    color:   '#64748B',
    bg:      '#F8FAFC',
    border:  '#E2E8F0',
    leads:   '100',
    features: [
      { label:'100 leads max',              ok:true  },
      { label:'Basic lead management',      ok:true  },
      { label:'C1/C2/C3 call tracking',     ok:true  },
      { label:'Email login',                ok:true  },
      { label:'Data analysis & reports',    ok:false },
      { label:'PPT export',                 ok:false },
      { label:'Google login',               ok:false },
      { label:'Excel/Sheets import',        ok:false },
      { label:'Priority support',           ok:false },
    ],
  },
  {
    key:     'pro',
    name:    'Pro',
    price:   2999,
    period:  '/month',
    color:   '#F59E0B',
    bg:      '#FFFBEB',
    border:  '#F59E0B',
    leads:   'Unlimited',
    features: [
      { label:'Unlimited leads',            ok:true  },
      { label:'Basic lead management',      ok:true  },
      { label:'C1/C2/C3 call tracking',     ok:true  },
      { label:'Email + Google + OTP login', ok:true  },
      { label:'Data analysis & reports',    ok:true  },
      { label:'Excel/Sheets import',        ok:true  },
      { label:'PPT export (PowerPoint)',    ok:true  },
      { label:'Priority support',           ok:true  },
    ],
  },
]

export default function PricingPage() {
  const { user, orgPlan, isOrgOwner } = useAuth()
  const nav = useNavigate()
  const normalizedOrgPlan = orgPlan === 'free' ? 'trial' : orgPlan
  const [loading, setLoading]   = useState(null) // which plan is loading
  const [planStatus, setPlanStatus] = useState(null)
  const [history, setHistory]   = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const [s, h] = await Promise.all([
        axios.get('/api/payment/status'),
        axios.get('/api/payment/history'),
      ])
      setPlanStatus(s.data)
      setHistory(h.data.payments || [])
    } catch(e) {}
  }

  const handleUpgrade = async (plan) => {
    if (!isOrgOwner) return toast.error('Only owner-level roles can upgrade the plan')
    if (plan === normalizedOrgPlan) return toast.error(`You are already on the ${plan} plan`)
    if (plan === 'trial')  return toast.error('To downgrade, contact support')

    setLoading(plan)
    try {
      // Step 1: Create Razorpay order
      const { data } = await axios.post('/api/payment/create-order', { plan })

      // Step 2: Open Razorpay checkout
      const options = {
        key:         data.key,
        amount:      data.order.amount,
        currency:    data.order.currency,
        name:        'CRM Pro',
        description: `${data.planName} — ${data.orgName}`,
        order_id:    data.order.id,
        prefill: {
          name:  data.userName,
          email: data.userEmail,
        },
        theme: { color: plan === 'pro' ? '#F59E0B' : '#3B6FFF' },
        modal: {
          ondismiss: () => {
            setLoading(null)
            toast('Payment cancelled', { icon:'ℹ️' })
          }
        },
        handler: async (response) => {
          // Step 3: Verify payment on backend
          try {
            const verify = await axios.post('/api/payment/verify', {
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan,
            })
            toast.success(verify.data.message)
            await loadStatus()
            // Reload page to update plan in context
            setTimeout(() => window.location.reload(), 1500)
          } catch(e) {
            toast.error(e.response?.data?.message || 'Payment verification failed')
          } finally { setLoading(null) }
        },
      }

      // Load Razorpay checkout script if not already loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload  = resolve
          script.onerror = () => reject(new Error('Failed to load Razorpay'))
          document.head.appendChild(script)
        })
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`)
        setLoading(null)
      })
      rzp.open()

    } catch(e) {
      toast.error(e.response?.data?.message || 'Could not initiate payment')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'0 0 40px' }}>

      {/* Header */}
      <div style={{ background:'var(--navy)', padding:'28px 32px 32px', textAlign:'center', position:'relative' }}>
        <button
          onClick={() => nav(-1)}
          className="btn btn-ghost btn-sm"
          style={{ position:'absolute', left:24, top:24, color:'rgba(255,255,255,.6)', borderColor:'rgba(255,255,255,.15)' }}
        >
          <RiArrowLeftLine/> Back
        </button>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:12 }}>
          <RiVipCrownLine size={28} color="#F59E0B"/>
          <h1 style={{ color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:28, fontWeight:900 }}>Choose Your Plan</h1>
        </div>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:14 }}>
          Upgrade to unlock more leads, reports, and PPT exports
        </p>

        {/* Current plan badge */}
        {planStatus && (
          <div style={{ marginTop:14, display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
            borderRadius:99, padding:'6px 16px', fontSize:13, color:'rgba(255,255,255,.8)' }}>
            Current: <strong style={{ color:'#F59E0B', textTransform:'uppercase' }}>{normalizedOrgPlan === 'trial' ? 'TRIAL PACK' : normalizedOrgPlan.toUpperCase()}</strong>
            {planStatus.validTill && planStatus.plan !== 'trial' && planStatus.plan !== 'free' && (
              <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>
                · {planStatus.daysLeft} days left
              </span>
            )}
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth:960, margin:'32px auto', padding:'0 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {PLANS.map(plan => {
          const isCurrent  = normalizedOrgPlan === plan.key
          const isLoading  = loading === plan.key
          const isUpgrade  = plan.key !== 'trial' && plan.key !== normalizedOrgPlan

          return (
            <div key={plan.key} style={{
              background:  plan.popular ? plan.bg : '#fff',
              border:      `2px solid ${isCurrent ? plan.color : plan.popular ? plan.border : '#E2E8F0'}`,
              borderRadius:16,
              padding:     '28px 24px',
              position:    'relative',
              boxShadow:   plan.popular ? `0 8px 32px rgba(59,111,255,.18)` : '0 2px 12px rgba(0,0,0,.06)',
              transition:  'transform .2s',
            }}>
              {/* Popular badge */}
              {plan.popular && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                  background:plan.color, color:'#fff', borderRadius:99, padding:'4px 14px',
                  fontSize:11, fontWeight:800, letterSpacing:.5 }}>
                  MOST POPULAR
                </div>
              )}
              {/* Current badge */}
              {isCurrent && (
                <div style={{ position:'absolute', top:-12, right:16,
                  background:'var(--success)', color:'#fff', borderRadius:99, padding:'4px 12px',
                  fontSize:11, fontWeight:800 }}>
                  ✓ CURRENT
                </div>
              )}

              {/* Plan name & price */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:plan.color, textTransform:'uppercase', letterSpacing:.8, marginBottom:6 }}>
                  {plan.name}
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:36, fontWeight:900, fontFamily:'Outfit,sans-serif', color:'var(--text)' }}>
                    {plan.price === 0 ? 'Trial pack' : `₹${plan.price.toLocaleString()}`}
                  </span>
                  {plan.period && <span style={{ fontSize:13, color:'var(--muted)' }}>{plan.period}</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                  Up to <strong style={{ color:plan.color }}>{plan.leads}</strong> leads
                </div>
              </div>

              {/* Features */}
              <div style={{ marginBottom:24 }}>
                {plan.features.map((f,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0',
                    opacity: f.ok ? 1 : 0.45 }}>
                    {f.ok
                      ? <RiCheckLine size={15} color={plan.color} style={{ flexShrink:0 }}/>
                      : <RiCloseLine size={15} color="#94A3B8" style={{ flexShrink:0 }}/>
                    }
                    <span style={{ fontSize:13, color: f.ok ? 'var(--text-2)' : 'var(--muted)' }}>{f.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              {plan.key === 'trial' ? (
                <button className="btn btn-ghost" style={{ width:'100%', cursor:'default' }} disabled>
                  {isCurrent ? 'Your current plan' : 'Trial pack'}
                </button>
              ) : (
                <button
                  className="btn"
                  style={{
                    width:'100%', padding:'12px',
                    background: isCurrent ? '#E2E8F0' : plan.color,
                    color:      isCurrent ? 'var(--muted)' : '#fff',
                    border:     'none',
                    cursor:     isCurrent ? 'not-allowed' : 'pointer',
                    fontSize:   14, fontWeight:700,
                  }}
                  onClick={() => !isCurrent && handleUpgrade(plan.key)}
                  disabled={isCurrent || isLoading}
                >
                  {isLoading ? 'Processing…' : isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory(s=>!s)}
            style={{ marginBottom:14 }}
          >
            📋 {showHistory ? 'Hide' : 'View'} Payment History
          </button>

          {showHistory && (
            <div className="card">
              <div className="card-title" style={{ marginBottom:14 }}>Payment History</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ fontSize:13 }}>
                  <thead>
                    <tr>
                      <th>Date</th><th>Plan</th><th>Amount</th><th>Valid Till</th><th>Status</th><th>Payment ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p,i) => (
                      <tr key={i}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td><span className={`badge ${p.plan==='pro'?'b-amber':'b-blue'}`}>{p.plan?.toUpperCase()}</span></td>
                        <td>₹{(p.amount/100).toLocaleString()}</td>
                        <td>{p.validTill ? new Date(p.validTill).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`badge ${p.status==='paid'?'b-green':p.status==='failed'?'b-red':'b-gray'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)' }}>
                          {p.razorpayPaymentId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Razorpay trust badge */}
      <div style={{ textAlign:'center', marginTop:28, color:'var(--muted)', fontSize:12 }}>
        🔒 Payments secured by <strong>Razorpay</strong> · UPI · Cards · Net Banking · Wallets
      </div>
    </div>
  )
}
