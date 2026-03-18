import { useState, useEffect } from 'react'
import { datasetsApi, testCasesApi, reportsApi } from '../lib/api'
import { Database, FlaskConical, CheckCircle, XCircle, Clock, Activity, TrendingUp, Layers } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const PIE_COLORS = ['#30d158', '#ff453a', '#ffd60a', '#636366']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [dsStats, setDsStats] = useState(null)
  const [tcStats, setTcStats] = useState(null)
  const [reportSummary, setReportSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      datasetsApi.stats(),
      testCasesApi.stats(),
      reportsApi.summary(),
    ]).then(([ds, tc, rp]) => {
      setDsStats(ds.data)
      setTcStats(tc.data)
      setReportSummary(rp.data)
    }).finally(() => setLoading(false))
  }, [])

  const pieData = reportSummary ? [
    { name: 'Passed', value: reportSummary.passed },
    { name: 'Failed', value: reportSummary.failed },
    { name: 'Other', value: Math.max(0, reportSummary.total - reportSummary.passed - reportSummary.failed) },
  ].filter(d => d.value > 0) : []

  const passRate = reportSummary?.total > 0
    ? Math.round((reportSummary.passed / reportSummary.total) * 100)
    : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of your test data and execution results</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="status-dot status-dot-green" />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Live</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-label">Datasets</span>
              <div style={{ background: 'var(--accent-blue-soft)', padding: 6, borderRadius: 8 }}>
                <Database size={14} color="var(--accent-blue)" />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{dsStats?.total_datasets ?? 0}</div>
            <div className="stat-delta up">↑ {dsStats?.total_records ?? 0} records total</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-label">Test Cases</span>
              <div style={{ background: 'var(--accent-purple-soft)', padding: 6, borderRadius: 8 }}>
                <FlaskConical size={14} color="var(--accent-purple)" />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{tcStats?.total_test_cases ?? 0}</div>
            <div className="stat-delta" style={{ color: 'var(--text-tertiary)' }}>{tcStats?.running ?? 0} running now</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-label">Pass Rate</span>
              <div style={{ background: 'var(--accent-green-soft)', padding: 6, borderRadius: 8 }}>
                <TrendingUp size={14} color="var(--accent-green)" />
              </div>
            </div>
            <div className="stat-value" style={{ color: passRate >= 70 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{passRate}%</div>
            <div className="stat-delta up">{reportSummary?.passed ?? 0} of {reportSummary?.total ?? 0} runs</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-label">Failed</span>
              <div style={{ background: 'var(--accent-red-soft)', padding: 6, borderRadius: 8 }}>
                <XCircle size={14} color="var(--accent-red)" />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{reportSummary?.failed ?? 0}</div>
            <div className="stat-delta" style={{ color: 'var(--text-tertiary)' }}>Total failed executions</div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 28 }}>
          {/* Recent executions */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Executions</h3>
              <Activity size={14} color="var(--text-tertiary)" />
            </div>
            {reportSummary?.recent?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {reportSummary.recent.map((ex) => (
                  <div key={ex.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`status-dot status-dot-${ex.status === 'passed' ? 'green' : ex.status === 'failed' ? 'red' : 'yellow'}`} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Execution #{ex.id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {ex.started_at ? formatDistanceToNow(new Date(ex.started_at), { addSuffix: true }) : '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ex.duration && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ex.duration}s</span>
                      )}
                      <span className={`badge badge-${ex.status === 'passed' ? 'passed' : ex.status === 'failed' ? 'failed' : 'running'}`}>
                        {ex.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Clock size={24} className="empty-state-icon" />
                <p>No executions yet. Run a test case to get started.</p>
              </div>
            )}
          </div>

          {/* Pie chart */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Result Distribution</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i] }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Layers size={24} className="empty-state-icon" />
                <p>No execution data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        {dsStats?.categories?.length > 0 && (
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Dataset Categories</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dsStats.categories.map((cat) => (
                <span key={cat} className="badge badge-info" style={{ fontSize: 12 }}>{cat}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
