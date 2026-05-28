import { useState, useEffect, useMemo } from 'react'
import './App.css'

const EMPTY_FORM = {
  person: '',
  type: 'money',
  direction: 'they-owe-me',
  amount: '',
  description: '',
}

function useLocalStorage(key, init) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : init
    } catch {
      return init
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])
  return [state, setState]
}

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function formatMoney(n) {
  return '$' + parseFloat(n).toFixed(2)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const AVATAR_COLORS = [
  '#7c3aed','#0891b2','#059669','#d97706','#dc2626',
  '#7c3aed','#6366f1','#ec4899','#8b5cf6','#14b8a6',
]
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function App() {
  const [entries, setEntries] = useLocalStorage('owed-entries', [])
  const [filter, setFilter] = useState('outstanding')
  const [typeFilter, setTypeFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [target, setTarget] = useState(null)

  const stats = useMemo(() => {
    const outstanding = entries.filter(e => e.status === 'outstanding')
    const owedToMe = outstanding
      .filter(e => e.direction === 'they-owe-me' && e.type === 'money')
      .reduce((s, e) => s + Number(e.amount), 0)
    const iOwe = outstanding
      .filter(e => e.direction === 'i-owe-them' && e.type === 'money')
      .reduce((s, e) => s + Number(e.amount), 0)
    const favorsOwed = outstanding.filter(e => e.type === 'favor' && e.direction === 'they-owe-me').length
    const iOweFavors = outstanding.filter(e => e.type === 'favor' && e.direction === 'i-owe-them').length
    return { owedToMe, iOwe, net: owedToMe - iOwe, favorsOwed, iOweFavors }
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filter === 'outstanding' && e.status !== 'outstanding') return false
      if (filter === 'settled' && e.status !== 'settled') return false
      if (typeFilter === 'money' && e.type !== 'money') return false
      if (typeFilter === 'favor' && e.type !== 'favor') return false
      return true
    })
  }, [entries, filter, typeFilter])

  function openCreate() {
    setForm(EMPTY_FORM)
    setTarget(null)
    setModal('create')
  }

  function openEdit(e) {
    setForm({
      person: e.person,
      type: e.type,
      direction: e.direction,
      amount: e.amount ?? '',
      description: e.description,
    })
    setTarget(e)
    setModal('edit')
  }

  function openDelete(e) {
    setTarget(e)
    setModal('delete')
  }

  function closeModal() {
    setModal(null)
    setTarget(null)
    setForm(EMPTY_FORM)
  }

  function handleSave() {
    const valid = form.person.trim() && form.description.trim() &&
      (form.type === 'favor' || (form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0))
    if (!valid) return

    if (modal === 'create') {
      setEntries(prev => [{
        id: crypto.randomUUID(),
        person: form.person.trim(),
        type: form.type,
        direction: form.direction,
        amount: form.type === 'money' ? Number(form.amount) : null,
        description: form.description.trim(),
        status: 'outstanding',
        createdAt: new Date().toISOString(),
        settledAt: null,
      }, ...prev])
    } else {
      setEntries(prev => prev.map(e =>
        e.id === target.id ? {
          ...e,
          person: form.person.trim(),
          type: form.type,
          direction: form.direction,
          amount: form.type === 'money' ? Number(form.amount) : null,
          description: form.description.trim(),
        } : e
      ))
    }
    closeModal()
  }

  function handleSettle(id) {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'settled', settledAt: new Date().toISOString() } : e
    ))
  }

  function handleUnsettle(id) {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'outstanding', settledAt: null } : e
    ))
  }

  function handleDelete() {
    setEntries(prev => prev.filter(e => e.id !== target.id))
    closeModal()
  }

  const isFormValid = form.person.trim() && form.description.trim() &&
    (form.type === 'favor' || (form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0))

  return (
    <div className="app" onKeyDown={e => e.key === 'Escape' && closeModal()}>

      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⇄</div>
          <div>
            <h1>OWED</h1>
            <span>DEBT TRACKER</span>
          </div>
        </div>
        <button className="btn-add" onClick={openCreate}>+ Add Entry</button>
      </header>

      {/* ── Balance Hero ── */}
      <div className="hero-section">
        <div className={`net-balance ${stats.net >= 0 ? 'positive' : 'negative'}`}>
          <div className="net-label">Net Balance</div>
          <div className="net-amount">
            {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
          </div>
          <div className="net-sub">
            {stats.net >= 0 ? "You're ahead overall" : "You owe more than you're owed"}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card green">
            <div className="stat-value">{formatMoney(stats.owedToMe)}</div>
            <div className="stat-label">Owed to you</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{formatMoney(stats.iOwe)}</div>
            <div className="stat-label">You owe</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">{stats.favorsOwed}</div>
            <div className="stat-label">Favors owed you</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-value">{stats.iOweFavors}</div>
            <div className="stat-label">Favors you owe</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="toolbar">
        <div className="filter-group">
          {[['outstanding','Outstanding'],['settled','Settled'],['all','All']].map(([v,l]) => (
            <button key={v} className={`filter-tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="filter-group">
          {[['all','All Types'],['money','Money'],['favor','Favors']].map(([v,l]) => (
            <button key={v} className={`filter-tab${typeFilter === v ? ' active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
          ))}
        </div>
        <span className="count-badge">{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {/* ── List ── */}
      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⇌</div>
            <h3>{filter === 'settled' ? 'No settled entries yet' : 'All clear — no debts here'}</h3>
            <p>{filter === 'outstanding' ? 'Add an entry to start tracking' : 'Change the filter to see more'}</p>
          </div>
        ) : (
          filtered.map(entry => {
            const isMoney = entry.type === 'money'
            const theyOweMe = entry.direction === 'they-owe-me'
            const settled = entry.status === 'settled'

            return (
              <div key={entry.id} className={`entry-card ${settled ? 'settled' : theyOweMe ? 'owed-to-me' : 'i-owe'}`}>
                {/* Avatar */}
                <div className="avatar" style={{ background: avatarColor(entry.person) }}>
                  {initials(entry.person)}
                </div>

                {/* Body */}
                <div className="entry-body">
                  <div className="entry-top">
                    <span className="entry-person">{entry.person}</span>
                    <span className={`direction-badge ${theyOweMe ? 'green' : 'red'}`}>
                      {theyOweMe ? '← owes you' : '→ you owe'}
                    </span>
                  </div>
                  <div className="entry-desc">{entry.description}</div>
                  <div className="entry-meta">
                    <span className={`type-chip ${isMoney ? '' : 'favor'}`}>
                      {isMoney ? '💵 Money' : '🤝 Favor'}
                    </span>
                    <span className="entry-date">{formatDate(entry.createdAt)}</span>
                    {settled && entry.settledAt && (
                      <span className="settled-badge">✓ Settled {formatDate(entry.settledAt)}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                {isMoney && (
                  <div className={`entry-amount ${settled ? '' : theyOweMe ? 'green' : 'red'}`}>
                    {theyOweMe ? '+' : '-'}{formatMoney(entry.amount)}
                  </div>
                )}

                {/* Actions */}
                <div className="entry-actions">
                  {!settled ? (
                    <button className="btn-settle" onClick={() => handleSettle(entry.id)} title="Mark as settled">✓</button>
                  ) : (
                    <button className="btn-unsettle" onClick={() => handleUnsettle(entry.id)} title="Mark as outstanding">↩</button>
                  )}
                  <button className="btn-icon" onClick={() => openEdit(entry)} title="Edit">✎</button>
                  <button className="btn-icon delete" onClick={() => openDelete(entry)} title="Delete">✕</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {modal === 'create' && 'New Entry'}
                {modal === 'edit' && 'Edit Entry'}
                {modal === 'delete' && 'Delete Entry'}
              </h2>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>

            {modal === 'delete' ? (
              <>
                <p className="confirm-text">
                  Delete the entry with <strong>{target.person}</strong>? This can't be undone.
                </p>
                <div className="form-actions">
                  <button className="btn-cancel" onClick={closeModal}>Cancel</button>
                  <button className="btn-delete-confirm" onClick={handleDelete}>Delete</button>
                </div>
              </>
            ) : (
              <div className="form">
                <div className="form-row">
                  <div className="field">
                    <label>Person</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Their name..."
                      value={form.person}
                      onChange={e => setForm(f => ({ ...f, person: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, amount: '' }))}>
                      <option value="money">Money</option>
                      <option value="favor">Favor</option>
                    </select>
                  </div>
                </div>

                <div className="direction-toggle">
                  <button
                    type="button"
                    className={`dir-btn${form.direction === 'they-owe-me' ? ' active green' : ''}`}
                    onClick={() => setForm(f => ({ ...f, direction: 'they-owe-me' }))}
                  >
                    ← They owe me
                  </button>
                  <button
                    type="button"
                    className={`dir-btn${form.direction === 'i-owe-them' ? ' active red' : ''}`}
                    onClick={() => setForm(f => ({ ...f, direction: 'i-owe-them' }))}
                  >
                    → I owe them
                  </button>
                </div>

                {form.type === 'money' && (
                  <div className="field">
                    <label>Amount ($)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                )}

                <div className="field">
                  <label>What for?</label>
                  <input
                    type="text"
                    placeholder={form.type === 'money' ? 'Dinner, concert tickets...' : 'Help moving, driving to airport...'}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-cancel" onClick={closeModal}>Cancel</button>
                  <button className="btn-save" disabled={!isFormValid} onClick={handleSave}>
                    {modal === 'create' ? 'Add Entry' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
