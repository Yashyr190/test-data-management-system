import { useState, useEffect } from 'react'
import { reportsApi, testCasesApi } from '../lib/api'
import toast from 'react-hot-toast'
import { FileText, Download, RefreshCw, ExternalLink, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [testCases, setTestCases] = useState([])
  const [summary, setSummary] = useState(null)
  const [generating, setGenerating] = useState({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [rRes, tcRes, sRes] = await Promise.all([
      reportsApi.list(),
      testCasesApi.list(),
      reportsApi.summary(),
    ])
    setReports(rRes.data)
    setTestCases(tcRes.data)
    setSummary(sRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generate = async (tc) => {
    setGenerating(g => ({ ...g, [tc.id]: true }))
    try {
      const res = await reportsApi.generate(tc.id)
      toast.success('Report generated!')
      load()
      window.open(res.data.report_url, '_blank')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerating(g => ({ ...g, [tc.id]: false }))
    }
  }

  const passRate = summary?.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Generate and view test execution reports with screenshots</p>
          </div>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Summary */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-value">{summary.total}</div>
              <div className="stat-label">Total Executions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{summary.passed}</div>
              <div className="stat-label">Passed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{summary.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: passRate >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{passRate}%</div>
              <div className="stat-label">Pass Rate</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Generate reports */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate Report</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {testCases.map(tc => {
                const execs = tc.executions || []
                const passed = execs.filter(e => e.status === 'passed').length
                const failed = execs.filter(e => e.status === 'failed').length
                const hasRun = execs.length > 0

                return (
                  <div key={tc.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.name}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {hasRun ? (
                          <>
                            <span style={{ fontSize: 11, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle size={10} /> {passed} passed
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <XCircle size={10} /> {failed} failed
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{execs.length} total runs</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>Never executed</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => generate(tc)}
                      disabled={generating[tc.id] || !hasRun}
                      title={!hasRun ? 'Run the test case first' : 'Generate HTML report'}
                    >
                      {generating[tc.id]
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <FileText size={12} />
                      }
                      Generate
                    </button>
                  </div>
                )
              })}
              {testCases.length === 0 && (
                <div className="empty-state card">
                  <FileText size={28} className="empty-state-icon" />
                  <p>No test cases yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Report files */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generated Reports</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reports.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 10, gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FileText size={13} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {r.filename}
                    </span>
                  </div>
                  <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-xs" title="Open report">
                    <ExternalLink size={12} color="var(--accent-blue)" />
                  </a>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <FileText size={24} className="empty-state-icon" />
                  <p>No reports yet. Generate one above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
