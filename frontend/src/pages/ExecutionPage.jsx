import { useState, useEffect, useRef, useCallback } from 'react'
import { testCasesApi, executionApi } from '../lib/api'
import toast from 'react-hot-toast'
import {
  Play, Square, Image as ImageIcon, CheckCircle, XCircle,
  AlertCircle, Clock, Globe, X, ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const WS_BASE = 'ws://localhost:8000'

const STATUS_ICON = {
  passed:  <CheckCircle size={13} color="var(--accent-green)" />,
  failed:  <XCircle size={13} color="var(--accent-red)" />,
  running: <div className="spinner" style={{ width: 13, height: 13 }} />,
  error:   <AlertCircle size={13} color="var(--accent-red)" />,
  pending: <Clock size={13} color="var(--accent-yellow)" />,
}

// ── URL Dialog ──────────────────────────────────────────────────
function URLDialog({ tc, onConfirm, onClose }) {
  const [url, setUrl] = useState('http://localhost:9000')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Set Target URL</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{tc.name}</p>
          </div>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 18,
          }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              This test case has <strong>{tc.steps?.length ?? 0} steps</strong>. Enter the base URL to run against.
              Steps that navigate to relative paths (e.g. <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)' }}>/login</code>) will be prefixed automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tc.steps?.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
                  <span className="badge badge-purple" style={{ fontSize: 9, flexShrink: 0 }}>{s.action}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.selector || s.value || s.description || ''}</span>
                </div>
              ))}
              {(tc.steps?.length ?? 0) > 3 && (
                <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>+{tc.steps.length - 3} more steps…</span>
              )}
            </div>
          </div>

          <div className="field-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Globe size={12} /> Base URL
            </label>
            <input
              className="input input-mono"
              placeholder="http://localhost:9000"
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(url) }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
              Examples: <code style={{ fontFamily: 'var(--font-mono)' }}>http://localhost:9000</code> · <code style={{ fontFamily: 'var(--font-mono)' }}>https://yourapp.com</code>
            </p>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {['http://localhost:9000', 'http://localhost:3000', 'http://localhost:8080', 'https://example.com'].map(preset => (
              <button
                key={preset}
                className="btn btn-secondary btn-xs"
                onClick={() => setUrl(preset)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(url)} disabled={!url.trim()}>
            <Play size={13} /> Run Test
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Live Terminal ───────────────────────────────────────────────
function LiveTerminal({ logs, status }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const lineClass = (entry) => {
    if (!entry) return ''
    if (entry._heartbeat) return 'heartbeat'
    if (entry.level === 'error') return 'error'
    const m = entry.message || ''
    if (m.includes('✅') || m.includes('✓') || m.toLowerCase().includes('passed')) return 'success'
    if (m.includes('FAILED') || m.includes('✗')) return 'error'
    if (m.includes('└─') || m.includes('┌─')) return 'step'
    if (m.includes('⬇') || m.includes('🌐') || m.includes('🔧') || m.includes('🚀') || m.includes('📍')) return 'info'
    if (m.includes('⚠') || m.includes('warning') || m.toLowerCase().includes('warn')) return 'warning'
    if (m.includes('⏳') || m.includes('heartbeat')) return 'heartbeat'
    return ''
  }

  return (
    <div className="terminal" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="terminal-header">
        <div className="terminal-dot terminal-dot-red" />
        <div className="terminal-dot terminal-dot-yellow" />
        <div className="terminal-dot terminal-dot-green" />
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          execution.log
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {status === 'running' && <><div className="status-dot status-dot-yellow" /><span style={{ fontSize: 10, color: 'var(--accent-yellow)' }}>RUNNING</span></>}
          {status === 'passed'  && <><div className="status-dot status-dot-green" /><span style={{ fontSize: 10, color: 'var(--accent-green)' }}>PASSED</span></>}
          {(status === 'failed' || status === 'error') && <><div className="status-dot status-dot-red" /><span style={{ fontSize: 10, color: 'var(--accent-red)' }}>FAILED</span></>}
          <span style={{ fontSize: 10, color: 'var(--text-quaternary)', marginLeft: 8 }}>{logs.length} lines</span>
        </div>
      </div>

      <div className="terminal-body" style={{ flex: 1, overflowY: 'auto' }}>
        {logs.length === 0 && status === 'idle' && (
          <div style={{ color: 'var(--text-quaternary)', fontStyle: 'italic' }}>
            $ select a test case and click Run to start…
            <span className="terminal-cursor" />
          </div>
        )}
        {logs.map((entry, i) => (
          <div key={i} className={`terminal-line ${lineClass(entry)}`}>
            <span className="ts">[{(entry.timestamp || '').slice(11, 19)}]</span>
            <span className="msg">{entry.message}</span>
          </div>
        ))}
        {status === 'running' && (
          <div className="terminal-line">
            <span className="ts">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span className="terminal-cursor" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function ExecutionPage() {
  const [testCases, setTestCases]       = useState([])
  const [allExecutions, setAllExecs]    = useState([])
  const [selectedTC, setSelectedTC]     = useState(null)
  const [currentExec, setCurrentExec]   = useState(null)
  const [logs, setLogs]                 = useState([])
  const [status, setStatus]             = useState('idle')
  const [screenshots, setScreenshots]   = useState([])
  const [showURLDialog, setShowURLDialog] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    testCasesApi.list().then(r => setTestCases(r.data))
    loadAllExecs()
  }, [])

  const loadAllExecs = async () => {
    const res = await executionApi.getAll(30)
    setAllExecs(res.data)
  }

  const connectWS = useCallback((execId) => {
    if (wsRef.current) { try { wsRef.current.close() } catch(_) {} }
    const socket = new WebSocket(`${WS_BASE}/api/execution/${execId}/ws`)

    socket.onmessage = (evt) => {
      const msg = JSON.parse(evt.data)
      if (msg.type === 'log') {
        setLogs(prev => [...prev, msg.data])
      } else if (msg.type === 'heartbeat') {
        // Show heartbeat as a dim pulsing line — replace last heartbeat if present
        setLogs(prev => {
          const last = prev[prev.length - 1]
          const isHB = last && last._heartbeat
          const entry = { ...msg.data, _heartbeat: true }
          return isHB ? [...prev.slice(0, -1), entry] : [...prev, entry]
        })
      } else if (msg.type === 'done') {
        socket.close()
        setTimeout(async () => {
          const res = await executionApi.get(execId)
          setStatus(res.data.status)
          setScreenshots(res.data.screenshots || [])
          setCurrentExec(res.data)
          loadAllExecs()
        }, 800)
      } else if (msg.type === 'error') {
        setStatus('error')
        setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'error', message: msg.message }])
      }
    }
    socket.onerror = () => {
      setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'error', message: 'WebSocket connection error' }])
    }
    wsRef.current = socket
  }, [])

  const handleRunConfirm = async (targetUrl) => {
    setShowURLDialog(false)
    if (!selectedTC) return

    setLogs([])
    setScreenshots([])
    setStatus('running')
    setCurrentExec(null)

    try {
      const res = await executionApi.run(selectedTC.id, targetUrl)
      const exec = res.data
      setCurrentExec(exec)
      connectWS(exec.id)
      toast.success(`Execution #${exec.id} started`)
    } catch (e) {
      toast.error(e.message)
      setStatus('error')
      setLogs([{ timestamp: new Date().toISOString(), level: 'error', message: e.message }])
    }
  }

  const stop = () => {
    if (wsRef.current) { try { wsRef.current.close() } catch(_) {} }
    setStatus('idle')
    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'error', message: '⚠ Execution stopped by user' }])
  }

  const viewExec = async (ex) => {
    const res = await executionApi.get(ex.id)
    setCurrentExec(res.data)
    setLogs(res.data.logs || [])
    setStatus(res.data.status)
    setScreenshots(res.data.screenshots || [])
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Live Execution</h1>
            <p className="page-subtitle">Run tests against any URL and watch logs stream in real-time</p>
          </div>
          {status === 'running' && (
            <button className="btn btn-danger" onClick={stop}>
              <Square size={12} /> Stop
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* ── Left panel ─────────────────────── */}
        <div style={{ width: 270, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Selector */}
          <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <label style={{ marginBottom: 8 }}>Test Case</label>
            <select
              className="input"
              value={selectedTC?.id || ''}
              onChange={e => setSelectedTC(testCases.find(tc => tc.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Choose a test case…</option>
              {testCases.map(tc => (
                <option key={tc.id} value={tc.id}>{tc.name}</option>
              ))}
            </select>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
              onClick={() => { if (selectedTC) setShowURLDialog(true) }}
              disabled={!selectedTC || status === 'running'}
            >
              {status === 'running' ? (
                <><span className="spinner" style={{ width: 13, height: 13, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Running…</>
              ) : (
                <><Globe size={13} /> Set URL & Run</>
              )}
            </button>

            {selectedTC && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{selectedTC.steps?.length ?? 0} steps · {selectedTC.priority} priority</div>
                {selectedTC.tags?.map(t => <span key={t} className="tag" style={{ marginRight: 3, marginBottom: 2, display: 'inline-block' }}>{t}</span>)}
              </div>
            )}
          </div>

          {/* History */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-quaternary)', padding: '4px 8px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Recent Runs
            </div>
            {allExecutions.map(ex => (
              <div
                key={ex.id}
                onClick={() => viewExec(ex)}
                style={{
                  padding: '8px 10px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
                  background: currentExec?.id === ex.id ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${currentExec?.id === ex.id ? 'var(--border-default)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  {STATUS_ICON[ex.status] || STATUS_ICON.pending}
                  <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.test_case_name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 19 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>#{ex.id}</span>
                  {ex.duration && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{ex.duration}s</span>}
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {ex.started_at ? formatDistanceToNow(new Date(ex.started_at), { addSuffix: true }) : ''}
                  </span>
                </div>
              </div>
            ))}
            {allExecutions.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-quaternary)', padding: '12px 8px' }}>No executions yet</p>
            )}
          </div>
        </div>

        {/* ── Right panel ────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Terminal */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
            <LiveTerminal logs={logs} status={status} />
          </div>

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <ImageIcon size={13} color="var(--text-tertiary)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Screenshots ({screenshots.length})
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {screenshots.map((sc, i) => {
                  const filename = sc.split('/').pop()
                  return (
                    <a key={i} href={`/${sc}`} target="_blank" rel="noreferrer">
                      <div style={{
                        width: 160, height: 100, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                        border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', position: 'relative',
                      }}>
                        <img src={`/${sc}`} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '4px 6px', background: 'rgba(0,0,0,0.75)',
                          fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{filename}</div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error summary */}
          {currentExec?.error_message && (status === 'failed' || status === 'error') && (
            <div style={{ margin: '0 20px 20px', background: 'var(--accent-red-soft)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <XCircle size={13} color="var(--accent-red)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-red)' }}>Execution Error</span>
              </div>
              <pre style={{ fontSize: 11, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                {currentExec.error_message}
              </pre>
            </div>
          )}
        </div>
      </div>

      {showURLDialog && selectedTC && (
        <URLDialog
          tc={selectedTC}
          onConfirm={handleRunConfirm}
          onClose={() => setShowURLDialog(false)}
        />
      )}
    </div>
  )
}
