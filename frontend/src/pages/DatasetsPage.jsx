import { useState, useEffect } from 'react'
import { datasetsApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Plus, Database, Trash2, ChevronRight, X, GitBranch, Eye, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function RecordRow({ record, datasetId, onDelete }) {
  return (
    <tr>
      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{record.key}</span></td>
      <td>
        {record.is_sensitive
          ? <span style={{ color: 'var(--text-tertiary)' }}>••••••••</span>
          : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{record.value || <em style={{ color: 'var(--text-quaternary)' }}>empty</em>}</span>
        }
      </td>
      <td><span className="badge badge-info">{record.data_type}</span></td>
      <td>
        <button className="btn btn-ghost btn-icon btn-xs" onClick={() => onDelete(record.id)}>
          <Trash2 size={12} color="var(--accent-red)" />
        </button>
      </td>
    </tr>
  )
}

function DatasetModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required')
    setLoading(true)
    try {
      await datasetsApi.create({ name, description: desc, category, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
      toast.success('Dataset created')
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
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>New Dataset</h2>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label>Name *</label>
            <input className="input" placeholder="User Auth Data" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label>Description</label>
            <textarea className="input" placeholder="What this dataset contains..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label>Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select...</option>
                <option value="Authentication">Authentication</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Validation">Validation</option>
                <option value="API">API</option>
                <option value="Performance">Performance</option>
                <option value="UI">UI</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="field-group">
              <label>Tags (comma-separated)</label>
              <input className="input" placeholder="auth, login, users" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
            Create Dataset
          </button>
        </div>
      </div>
    </div>
  )
}

function AddRecordModal({ datasetId, onClose, onAdded }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [dtype, setDtype] = useState('string')
  const [sensitive, setSensitive] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!key.trim()) return toast.error('Key is required')
    setLoading(true)
    try {
      await datasetsApi.addRecord(datasetId, { key, value, data_type: dtype, is_sensitive: sensitive })
      toast.success('Record added')
      onAdded()
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
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Record</h2>
          <button className="btn btn-ghost btn-icon btn-xs" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label>Key *</label>
            <input className="input input-mono" placeholder="username" value={key} onChange={e => setKey(e.target.value)} />
          </div>
          <div className="field-group">
            <label>Value</label>
            <input className="input input-mono" placeholder="testuser@example.com" value={value} onChange={e => setValue(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label>Type</label>
              <select className="input" value={dtype} onChange={e => setDtype(e.target.value)}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="email">email</option>
                <option value="url">url</option>
                <option value="json">json</option>
              </select>
            </div>
            <div className="field-group" style={{ justifyContent: 'flex-end', paddingTop: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={sensitive} onChange={e => setSensitive(e.target.checked)} />
                Sensitive / masked
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>Add Record</button>
        </div>
      </div>
    </div>
  )
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [view, setView] = useState('records') // 'records' | 'versions'

  const load = async () => {
    try {
      const res = await datasetsApi.list()
      setDatasets(res.data)
      if (selected) {
        const updated = res.data.find(d => d.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectDataset = async (ds) => {
    setSelected(ds)
    setView('records')
    const vRes = await datasetsApi.getVersions(ds.id)
    setVersions(vRes.data)
  }

  const deleteDataset = async (id) => {
    if (!confirm('Delete this dataset?')) return
    await datasetsApi.delete(id)
    toast.success('Deleted')
    if (selected?.id === id) setSelected(null)
    load()
  }

  const deleteRecord = async (recordId) => {
    await datasetsApi.deleteRecord(selected.id, recordId)
    toast.success('Record removed')
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fade-in" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 280, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>Datasets</h1>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{datasets.length} total</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {datasets.map(ds => (
            <div
              key={ds.id}
              onClick={() => selectDataset(ds)}
              style={{
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: selected?.id === ds.id ? 'var(--accent-blue-soft)' : 'transparent',
                border: `1px solid ${selected?.id === ds.id ? 'rgba(10,132,255,0.2)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Database size={13} color={selected?.id === ds.id ? 'var(--accent-blue)' : 'var(--text-tertiary)'} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: selected?.id === ds.id ? 'var(--accent-blue)' : 'var(--text-primary)', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ds.name}
                  </span>
                </div>
                <button className="btn btn-ghost btn-icon btn-xs" onClick={e => { e.stopPropagation(); deleteDataset(ds.id) }}>
                  <Trash2 size={11} color="var(--accent-red)" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 21 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>v{ds.version}</span>
                <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>·</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{ds.records?.length ?? 0} records</span>
                {ds.category && <span className="badge badge-info" style={{ fontSize: 9, padding: '1px 5px' }}>{ds.category}</span>}
              </div>
            </div>
          ))}
          {datasets.length === 0 && (
            <div className="empty-state"><Database size={24} className="empty-state-icon" /><p>No datasets yet</p></div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
                  {selected.description && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{selected.description}</p>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-info">v{selected.version}</span>
                    {selected.category && <span className="badge badge-purple">{selected.category}</span>}
                    {selected.tags?.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setView(view === 'records' ? 'versions' : 'records')}>
                    <GitBranch size={12} /> {view === 'records' ? 'History' : 'Records'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddRecord(true)}>
                    <Plus size={12} /> Add Record
                  </button>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px' }}>
              {view === 'records' ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Key</th><th>Value</th><th>Type</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.records?.map(r => (
                        <RecordRow key={r.id} record={r} datasetId={selected.id} onDelete={deleteRecord} />
                      ))}
                    </tbody>
                  </table>
                  {(!selected.records || selected.records.length === 0) && (
                    <div className="empty-state"><p>No records. Add some!</p></div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px 24px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Version History</h3>
                  {versions.map((v, i) => (
                    <div key={v.id} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? 'var(--accent-green)' : 'var(--text-tertiary)', flexShrink: 0, marginTop: 4 }} />
                        {i < versions.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                          <span className="badge badge-info">v{v.version}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.changelog}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <Database size={32} className="empty-state-icon" />
            <h3>Select a Dataset</h3>
            <p>Choose a dataset from the left panel to view and manage its records</p>
          </div>
        )}
      </div>

      {showCreate && <DatasetModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {showAddRecord && selected && <AddRecordModal datasetId={selected.id} onClose={() => setShowAddRecord(false)} onAdded={load} />}
    </div>
  )
}
