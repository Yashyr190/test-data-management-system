import { useState, useEffect } from 'react'
import { testCasesApi, datasetsApi, executionApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Plus, FlaskConical, Play, Trash2, X, ChevronDown, ChevronUp, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const PRIORITY_COLORS = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
const STATUS_COLORS = { passed: 'badge-passed', failed: 'badge-failed', running: 'badge-running', pending: 'badge-pending', error: 'badge-failed' }

// Inline URL dialog for quick run from test cases page
function QuickRunDialog({ tc, onConfirm, onClose }) {
  const [url, setUrl] = useState('http://localhost:9000')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Run: {tc.name}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Enter the base URL to test against</p>
          </div>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={12} /> Base URL</label>
            <input
              className="input input-mono"
              placeholder="http://localhost:9000"
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(url) }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['http://localhost:9000', 'http://localhost:3000', 'https://example.com'].map(p => (
              <button key={p} className="btn btn-secondary btn-xs" onClick={() => setUrl(p)} style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(url)} disabled={!url.trim()}>
            <Play size={12} /> Run
          </button>
        </div>
      </div>
    </div>
  )
}

function StepEditor({ steps, onChange }) {
  const addStep = () => onChange([...steps, { action: 'navigate', selector: '', value: '', wait: 1, description: '' }])
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i))
  const updateStep = (i, field, val) => {
    const next = [...steps]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ margin: 0 }}>Steps</label>
        <button className="btn btn-secondary btn-xs" type="button" onClick={addStep}><Plus size={10} /> Add Step</button>
      </div>
      {steps.map((step, i) => (
        <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, paddingTop: 8, minWidth: 20, textAlign: 'right' }}>{i + 1}</span>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 6 }}>
              <select className="input" style={{ fontSize: 11, padding: '6px 8px' }} value={step.action} onChange={e => updateStep(i, 'action', e.target.value)}>
                <option value="navigate">navigate</option>
                <option value="click">click</option>
                <option value="type">type</option>
                <option value="assert_text">assert_text</option>
                <option value="assert_visible">assert_visible</option>
                <option value="assert_url">assert_url</option>
                <option value="screenshot">screenshot</option>
                <option value="scroll">scroll</option>
                <option value="wait">wait</option>
              </select>
              <input className="input input-mono" style={{ fontSize: 11, padding: '6px 8px' }} placeholder="selector / url" value={step.selector || ''} onChange={e => updateStep(i, 'selector', e.target.value)} />
              <input className="input input-mono" style={{ fontSize: 11, padding: '6px 8px' }} placeholder="value / text" value={step.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} type="button" onClick={() => removeStep(i)}>
              <X size={12} color="var(--accent-red)" />
            </button>
          </div>
          {step.description !== undefined && (
            <input className="input" style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', background: 'var(--bg-secondary)' }} placeholder="Description (optional)" value={step.description || ''} onChange={e => updateStep(i, 'description', e.target.value)} />
          )}
        </div>
      ))}
      {steps.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-quaternary)', textAlign: 'center', padding: '12px 0' }}>No steps yet. Add a step above.</p>}
    </div>
  )
}

function TestCaseModal({ onClose, onCreated, datasets }) {
  const [form, setForm] = useState({
    name: '', description: '', test_type: 'selenium', target_url: '',
    priority: 'medium', expected_result: '', dataset_id: '', tags: '',
    steps: [],
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name required')
    setLoading(true)
    try {
      await testCasesApi.create({
        ...form,
        dataset_id: form.dataset_id ? parseInt(form.dataset_id) : null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('Test case created')
      onCreated()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>New Test Case</h2>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div className="field-group"><label>Name *</label><input className="input" placeholder="Login Flow Test" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field-group"><label>Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label>Type</label>
              <select className="input" value={form.test_type} onChange={e => set('test_type', e.target.value)}>
                <option value="selenium">selenium</option>
                <option value="api">api</option>
                <option value="visual">visual</option>
              </select>
            </div>
            <div className="field-group">
              <label>Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="field-group">
              <label>Dataset</label>
              <select className="input" value={form.dataset_id} onChange={e => set('dataset_id', e.target.value)}>
                <option value="">None</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field-group"><label>Target URL</label><input className="input" placeholder="https://example.com" value={form.target_url} onChange={e => set('target_url', e.target.value)} /></div>
          <div className="field-group"><label>Expected Result</label><input className="input" placeholder="Page loads and user is authenticated" value={form.expected_result} onChange={e => set('expected_result', e.target.value)} /></div>
          <div className="field-group"><label>Tags (comma-separated)</label><input className="input" placeholder="smoke, auth, login" value={form.tags} onChange={e => set('tags', e.target.value)} /></div>
          <div style={{ marginTop: 4 }}>
            <StepEditor steps={form.steps} onChange={steps => set('steps', steps)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />} Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState([])
  const [datasets, setDatasets] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [running, setRunning] = useState({})
  const [quickRunTC, setQuickRunTC] = useState(null)

  const load = async () => {
    const [tcRes, dsRes] = await Promise.all([testCasesApi.list(), datasetsApi.list()])
    setTestCases(tcRes.data)
    setDatasets(dsRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const runTest = async (tc, targetUrl) => {
    setQuickRunTC(null)
    setRunning(r => ({ ...r, [tc.id]: true }))
    try {
      const res = await executionApi.run(tc.id, targetUrl)
      toast.success(`Execution #${res.data.id} started — go to Live Execution to watch`)
      setTimeout(load, 4000)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setTimeout(() => setRunning(r => ({ ...r, [tc.id]: false })), 2000)
    }
  }

  const deleteTC = async (id) => {
    if (!confirm('Delete this test case?')) return
    await testCasesApi.delete(id)
    toast.success('Deleted')
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Test Cases</h1>
            <p className="page-subtitle">{testCases.length} test cases configured</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Test Case
          </button>
        </div>
      </div>

      <div className="page-body">
        {testCases.map(tc => {
          const lastExec = tc.executions?.[0]
          const isExpanded = expanded === tc.id
          return (
            <div key={tc.id} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
              <div
                style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                onClick={() => setExpanded(isExpanded ? null : tc.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <FlaskConical size={15} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.name}</div>
                    {tc.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.description}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`badge ${PRIORITY_COLORS[tc.priority] || 'badge-low'}`}>{tc.priority}</span>
                  {lastExec && <span className={`badge ${STATUS_COLORS[lastExec.status] || ''}`}>{lastExec.status}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{tc.steps?.length ?? 0} steps</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); setQuickRunTC(tc) }}
                    disabled={running[tc.id]}
                  >
                    {running[tc.id] ? <span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Play size={11} />}
                    Run
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); deleteTC(tc.id) }}>
                    <Trash2 size={13} color="var(--accent-red)" />
                  </button>
                  {isExpanded ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 20px', background: 'var(--bg-tertiary)' }} className="animate-slide-up">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Steps</div>
                      {tc.steps?.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-quaternary)', minWidth: 16, paddingTop: 2 }}>{i + 1}.</span>
                          <div>
                            <span className="badge badge-purple" style={{ marginRight: 6, fontSize: 10 }}>{step.action}</span>
                            {step.selector && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{step.selector}</span>}
                            {step.value && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}> = {step.value}</span>}
                          </div>
                        </div>
                      ))}
                      {(!tc.steps || tc.steps.length === 0) && <p style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>No steps defined</p>}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Executions</div>
                      {tc.executions?.slice(0, 5).map(ex => (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className={`status-dot status-dot-${ex.status === 'passed' ? 'green' : ex.status === 'failed' ? 'red' : 'yellow'}`} />
                            <span style={{ fontSize: 11 }}>#{ex.id}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {ex.duration && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{ex.duration}s</span>}
                            <span className={`badge ${STATUS_COLORS[ex.status]}`} style={{ fontSize: 10 }}>{ex.status}</span>
                          </div>
                        </div>
                      ))}
                      {(!tc.executions || tc.executions.length === 0) && <p style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>Never executed</p>}
                    </div>
                  </div>
                  {tc.tags?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 5 }}>
                      {tc.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {testCases.length === 0 && (
          <div className="empty-state card">
            <FlaskConical size={32} className="empty-state-icon" />
            <h3>No test cases yet</h3>
            <p>Create your first test case to get started</p>
          </div>
        )}
      </div>

      {showCreate && <TestCaseModal onClose={() => setShowCreate(false)} onCreated={load} datasets={datasets} />}
      {quickRunTC && <QuickRunDialog tc={quickRunTC} onConfirm={(url) => runTest(quickRunTC, url)} onClose={() => setQuickRunTC(null)} />}
    </div>
  )
}
