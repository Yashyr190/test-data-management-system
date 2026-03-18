import { useState, useEffect } from 'react'
import { manualApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Plus, ClipboardList, CheckCircle, XCircle, Trash2, X, Edit3, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function AddManualModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [testUrl, setTestUrl] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [fields, setFields] = useState([{ key: '', value: '' }])
  const [loading, setLoading] = useState(false)

  const addField = () => setFields(f => [...f, { key: '', value: '' }])
  const removeField = (i) => setFields(f => f.filter((_, idx) => idx !== i))
  const updateField = (i, k, v) => {
    const next = [...fields]
    next[i] = { ...next[i], [k]: v }
    setFields(next)
  }

  const submit = async () => {
    if (!name.trim()) return toast.error('Name required')
    const fieldObj = {}
    fields.forEach(f => { if (f.key.trim()) fieldObj[f.key.trim()] = f.value })
    setLoading(true)
    try {
      await manualApi.create({ name, test_url: testUrl, expected_behavior: expectedBehavior, fields: fieldObj })
      toast.success('Manual test entry added')
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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Manual Test Data</h2>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="field-group"><label>Test Name *</label><input className="input" placeholder="Login - Valid Credentials" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field-group"><label>Test URL</label><input className="input" placeholder="https://app.example.com/login" value={testUrl} onChange={e => setTestUrl(e.target.value)} /></div>
          <div className="field-group"><label>Expected Behavior</label><textarea className="input" rows={2} placeholder="User should be redirected to dashboard after login" value={expectedBehavior} onChange={e => setExpectedBehavior(e.target.value)} /></div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Test Fields</label>
              <button className="btn btn-secondary btn-xs" type="button" onClick={addField}><Plus size={10} /> Field</button>
            </div>
            {fields.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input input-mono" style={{ flex: 1 }} placeholder="field_name" value={f.key} onChange={e => updateField(i, 'key', e.target.value)} />
                <input className="input input-mono" style={{ flex: 2 }} placeholder="value" value={f.value} onChange={e => updateField(i, 'value', e.target.value)} />
                <button className="btn btn-ghost btn-icon" style={{ padding: 6 }} type="button" onClick={() => removeField(i)}>
                  <X size={12} color="var(--accent-red)" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />} Add Entry
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultModal({ entry, onClose, onSaved }) {
  const [result, setResult] = useState(entry.result || '')
  const [notes, setNotes] = useState(entry.notes || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!result) return toast.error('Select a result')
    setLoading(true)
    try {
      await manualApi.updateResult(entry.id, result, notes)
      toast.success('Result saved')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Record Result</h2>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{entry.name}</div>
            {entry.expected_behavior && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Expected: </strong>{entry.expected_behavior}
              </div>
            )}
          </div>

          {/* Fields review */}
          {Object.keys(entry.fields || {}).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label>Test Data Used</label>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
                {Object.entries(entry.fields).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span style={{ color: 'var(--accent-blue)', minWidth: 120 }}>{k}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="field-group">
            <label>Result *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['passed', 'failed', 'blocked', 'skipped'].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`btn ${result === r ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={result === r && r === 'passed' ? { background: 'var(--accent-green)' } : result === r && r === 'failed' ? { background: 'var(--accent-red)' } : {}}
                  onClick={() => setResult(r)}
                >
                  {r === 'passed' && <CheckCircle size={11} />}
                  {r === 'failed' && <XCircle size={11} />}
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="field-group">
            <label>Notes / Comments</label>
            <textarea className="input" rows={3} placeholder="Any observations, bugs found, environment details..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>Save Result</button>
        </div>
      </div>
    </div>
  )
}

const RESULT_STYLES = {
  passed: { badge: 'badge-passed', icon: <CheckCircle size={12} color="var(--accent-green)" /> },
  failed: { badge: 'badge-failed', icon: <XCircle size={12} color="var(--accent-red)" /> },
  blocked: { badge: 'badge-running', icon: null },
  skipped: { badge: 'badge-low', icon: null },
}

export default function ManualTestPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [recordingFor, setRecordingFor] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    const res = await manualApi.list()
    setEntries(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteEntry = async (id) => {
    await manualApi.delete(id)
    toast.success('Deleted')
    load()
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.result === filter || (filter === 'untested' && !e.result))

  const stats = {
    total: entries.length,
    passed: entries.filter(e => e.result === 'passed').length,
    failed: entries.filter(e => e.result === 'failed').length,
    untested: entries.filter(e => !e.result).length,
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Manual Testing</h1>
            <p className="page-subtitle">Add and track manual test cases and results</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Test Data
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
            { label: 'Passed', value: stats.passed, color: 'var(--accent-green)' },
            { label: 'Failed', value: stats.failed, color: 'var(--accent-red)' },
            { label: 'Untested', value: stats.untested, color: 'var(--accent-yellow)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '14px 18px' }}>
              <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {['all', 'passed', 'failed', 'untested'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(entry => {
            const rs = RESULT_STYLES[entry.result] || null
            return (
              <div key={entry.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {rs?.icon}
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{entry.name}</span>
                      {rs ? <span className={`badge ${rs.badge}`}>{entry.result}</span> : <span className="badge badge-running">untested</span>}
                    </div>

                    {entry.expected_behavior && (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Expected: </span>{entry.expected_behavior}
                      </p>
                    )}

                    {/* Fields */}
                    {Object.keys(entry.fields || {}).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {Object.entries(entry.fields).slice(0, 4).map(([k, v]) => (
                          <div key={k} style={{
                            display: 'flex', gap: 4, background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '2px 7px',
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                          }}>
                            <span style={{ color: 'var(--accent-blue)' }}>{k}:</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{String(v).slice(0, 30)}{String(v).length > 30 ? '…' : ''}</span>
                          </div>
                        ))}
                        {Object.keys(entry.fields).length > 4 && (
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingTop: 3 }}>+{Object.keys(entry.fields).length - 4} more</span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      {entry.test_url && (
                        <a href={entry.test_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ExternalLink size={10} /> {entry.test_url}
                        </a>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
                        Added {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                      {entry.tested_at && (
                        <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
                          · Tested {formatDistanceToNow(new Date(entry.tested_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: 6, borderLeft: '2px solid var(--border-strong)' }}>
                        {entry.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setRecordingFor(entry)}>
                      <Edit3 size={11} /> Record Result
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 size={13} color="var(--accent-red)" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state card">
              <ClipboardList size={32} className="empty-state-icon" />
              <h3>No entries {filter !== 'all' ? `with status "${filter}"` : ''}</h3>
              <p>Add test data manually to track your testing progress</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddManualModal onClose={() => setShowAdd(false)} onCreated={load} />}
      {recordingFor && <ResultModal entry={recordingFor} onClose={() => setRecordingFor(null)} onSaved={load} />}
    </div>
  )
}
