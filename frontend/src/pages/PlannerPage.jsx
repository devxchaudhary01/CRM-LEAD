import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  RiArrowLeftLine, RiArrowRightLine, RiPhoneLine,
} from 'react-icons/ri'

const OUTCOMES = { I: 'Interested', NI: 'Not Interested', CB: 'Call Back', NA: 'No Answer' }
const OUTCOME_COLORS = { I: '#00C48C', NI: '#FF4757', CB: '#FFA502', NA: '#94A3B8' }

/* ─── Daily Follow-ups Modal ────────────────────────────── */
function DailyFollowUpsModal({ date, leads, onClose }) {
  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">📅 Follow-ups for {dateStr}</div>
            <div className="modal-sub">{leads.length} lead{leads.length !== 1 ? 's' : ''} scheduled</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leads.map(lead => (
            <div key={lead._id} style={{
              padding: '12px 14px',
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: 'var(--surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{lead.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  <div>📞 {lead.contactNo || 'N/A'}</div>
                  <div>📧 {lead.emailId || 'N/A'}</div>
                </div>
                
                {/* C1 call info */}
                {lead.c1?.outcome && (
                  <div style={{ background: '#F0F4FB', padding: '8px 10px', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Last Call (C1):</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: OUTCOME_COLORS[lead.c1.outcome]
                      }}></span>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{OUTCOMES[lead.c1.outcome]}</span>
                      {lead.c1.date && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(lead.c1.date).toLocaleDateString()}</span>}
                    </div>
                    {lead.c1.notes && <div style={{ fontSize: 10, marginTop: 4, color: 'var(--muted)', fontStyle: 'italic' }}>"{lead.c1.notes}"</div>}
                  </div>
                )}

                {/* Status badge */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: lead.status === 'pending' ? '#E5E7EB' :
                                lead.status === 'in_progress' ? '#DBEAFE' :
                                lead.status === 'converted' ? '#DCFCE7' : '#FEE2E2',
                    color: lead.status === 'pending' ? '#374151' :
                           lead.status === 'in_progress' ? '#1E40AF' :
                           lead.status === 'converted' ? '#15803D' : '#991B1B'
                  }}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Call actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={`tel:${lead.contactNo}`} className="btn btn-ghost btn-sm" title="Call" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RiPhoneLine size={14} />
                </a>
              </div>
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

/* ─── Main Planner Page ─────────────────────────────────── */
export default function PlannerPage() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allLeads, setAllLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState([])

  /* Fetch all leads with followUpDate */
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      let allData = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const { data } = await axios.get('/api/leads', { params: { page, limit: 100 } })
        allData = [...allData, ...data.leads]
        hasMore = page < data.pages
        page++
      }
      
      setAllLeads(allData.filter(l => l.followUpDate))
    } catch (e) {
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  /* Get leads for a specific date */
  const getLeadsForDate = (date) => {
    const dateStr = date.toISOString().substring(0, 10)
    return allLeads.filter(lead => {
      const followUpStr = new Date(lead.followUpDate).toISOString().substring(0, 10)
      return followUpStr === dateStr
    })
  }

  /* Calendar generation */
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  
  const monthDays = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const calendarDays = []
  
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= monthDays; i++) calendarDays.push(i)

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = months[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📅 Follow-up Planner</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>View and manage scheduled follow-ups across your calendar</p>
      </div>

      {/* Calendar Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        padding: '12px 16px',
        background: 'var(--surface)',
        borderRadius: 9,
        border: '1px solid var(--border)'
      }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth} title="Previous month">
          <RiArrowLeftLine />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', flex: 1 }}>
          {monthName} {year}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth} title="Next month">
          <RiArrowRightLine />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={goToToday} title="Go to today" style={{ marginLeft: 8 }}>
          Today
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: 9,
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3B6FFF' }}>{allLeads.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Follow-ups</div>
        </div>
        <div style={{
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: 9,
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00C48C' }}>
            {allLeads.filter(l => new Date(l.followUpDate) <= new Date()).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Due/Overdue</div>
        </div>
        <div style={{
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: 9,
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFA502' }}>
            {allLeads.filter(l => {
              const d = new Date(l.followUpDate);
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 7);
              return d > today && d <= tomorrow;
            }).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>This Week</div>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 9,
          overflow: 'hidden'
        }}>
          {/* Weekday headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)'
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--muted)',
                background: 'var(--bg)'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            background: 'var(--border)',
            padding: '1px'
          }}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ background: 'var(--surface)' }}></div>
              }

              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              const dateStr = date.toISOString().substring(0, 10)
              const todayStr = new Date().toISOString().substring(0, 10)
              const isToday = dateStr === todayStr
              const dayLeads = getLeadsForDate(date)
              const isPast = dateStr < todayStr
              const isOverdue = isPast && dayLeads.length > 0

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    if (dayLeads.length > 0) {
                      setSelectedDate(date)
                      setSelectedLeads(dayLeads)
                    }
                  }}
                  style={{
                    padding: 10,
                    minHeight: 120,
                    background: isToday ? '#F0FBF7' :
                               isOverdue ? '#FEE2E2' : 'var(--surface)',
                    border: isToday ? '2px solid #00C48C' :
                           isOverdue ? '2px solid #FF4757' : '1px solid transparent',
                    borderRadius: 10,
                    cursor: dayLeads.length > 0 ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'background .15s ease, border .15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (dayLeads.length > 0) e.currentTarget.style.background = '#F8FAFC'
                  }}
                  onMouseLeave={(e) => {
                    if (dayLeads.length === 0) return
                    e.currentTarget.style.background = isToday ? '#F0FBF7' :
                                                      isOverdue ? '#FEE2E2' : 'var(--surface)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#0F766E' : '#0F172A' }}>{day}</span>
                      {dayLeads.length > 0 && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: isOverdue ? '#B91C1C' : '#1D4ED8',
                          background: isOverdue ? '#FECACA' : '#DBEAFE',
                          borderRadius: 999,
                          padding: '2px 7px'
                        }}>
                          {dayLeads.length}
                        </span>
                      )}
                    </div>

                    {dayLeads.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {dayLeads.slice(0, 2).map(lead => (
                          <div key={lead._id} style={{
                            fontSize: 11,
                            padding: '6px 8px',
                            background: '#EFF6FF',
                            borderRadius: 8,
                            color: '#0F172A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {lead.name}
                          </div>
                        ))}
                        {dayLeads.length > 2 && (
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            +{dayLeads.length - 2} more follow-up{dayLeads.length - 2 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                        No follow-ups
                      </div>
                    )}
                  </div>

                  {dayLeads.length > 0 && (
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isOverdue ? '#B91C1C' : '#1D4ED8',
                    }}>
                      {dayLeads.length} follow-up{dayLeads.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily follow-ups modal */}
      {selectedDate && (
        <DailyFollowUpsModal
          date={selectedDate}
          leads={selectedLeads}
          onClose={() => {
            setSelectedDate(null)
            setSelectedLeads([])
          }}
        />
      )}
    </div>
  )
}
