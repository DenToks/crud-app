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
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function formatMoney(n) {
  return '$' + parseFloat(n).toFixed(2)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const AVATAR_COLORS = [
  '#7c3aed','#0891b2','#059669','#d97706','#dc2626',
  '#6366f1','#ec4899','#8b5cf6','#14b8a6','#f59e0b',
]
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STEPS = [
  {
    num: '01',
    icon: '＋',
    title: 'Add an entry',
    desc: 'Hit "+ Add Entry". Choose Money or Favor, set who owes who, and describe what it\'s for.',
  },
  {
    num: '02',
    icon: '⇄',
    title: 'Track automatically',
    desc: 'Your net balance updates instantly. See exactly how much you\'re owed vs. how much you owe.',
  },
  {
    num: '03',
    icon: '✓',
    title: 'Settle up',
    desc: 'Once a debt is repaid, hit the green ✓ button. It moves to your history — no data lost.',
  },
]

function Onboarding({ onDone }) {
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="ob-logo">
          <div className="logo-icon">⇄</div>
          <div>
            <h1 className="ob-title">OWED</h1>
            <span className="ob-sub">DEBT &amp; FAVORS TRACKER</span>
          </div>
        </div>

        <p className="ob-tagline">
          Stop forgetting who owes who.<br />
          Track money <em>and</em> favors between friends — all in one place.
        </p>

        <div className="ob-steps">
          {STEPS.map(s => (
            <div className="ob-step" key={s.num}>
              <div className="ob-step-num">{s.num}</div>
              <div className="ob-step-icon">{s.icon}</div>
              <h3 className="ob-step-title">{s.title}</h3>
              <p className="ob-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="ob-note">
          💾 All data is saved in your browser. Nothing is sent anywhere.
        </div>

        <button className="btn-start" onClick={onDone}>
          Start Tracking →
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [entries, setEntries] = useLocalStorage('owed-entries', [])
  const [onboarded, setOnboarded] = useLocalStorage('owed-onboarded', false)
  const [showHelp, setShowHelp] = useState(false)
  const [filter, setFilter] = useState('outstanding')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
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
    const q = search.toLowerCase().trim()
    return entries.filter(e => {
      if (filter === 'outstanding' && e.status !== 'outstanding') return false
      if (filter === 'settled' && e.status !== 'settled') return false
      if (typeFilter === 'money' && e.type !== 'money') return false
      if (typeFilter === 'favor' && e.type !== 'favor') return false
      if (q && !e.person.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [entries, filter, typeFilter, search])

  function openCreate() {
    setForm(EMPTY_FORM)
    setTarget(null)
    setModal('create')
  }

  function openEdit(e) {
    setForm({ person: e.person, type: e.type, direction: e.direction, amount: e.amount ?? '', description: e.description })
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

  function handleClearSettled() {
    setEntries(prev => prev.filter(e => e.status !== 'settled'))
  }

  const settledCount = entries.filter(e => e.status === 'settled').length
  const isFormValid = form.person.trim() && form.description.trim() &&
    (form.type === 'favor' || (form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0))

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />
  }

  return (
    <div className="app" onKeyDown={e => e.key === 'Escape' && (modal ? closeModal() : setShowHelp(false))}>

      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⇄</div>
          <div>
            <h1>OWED</h1>
            <span>DEBT TRACKER</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-help" onClick={() => setShowHelp(true)} title="How to use">?</button>
          <button className="btn-add" onClick={openCreate}>+ Add Entry</button>
        </div>
      </header>

      {/* ── Balance Hero ── */}
      <div className="hero-section">
        <div className={`net-balance ${stats.net > 0 ? 'positive' : stats.net < 0 ? 'negative' : 'neutral'}`}>
          <div className="net-label">Net Balance</div>
          <div className="net-amount">
            {stats.net > 0 ? '+' : ''}{formatMoney(stats.net)}
          </div>
          <div className="net-sub">
            {stats.net > 0 ? "You're ahead — people owe you more" : stats.net < 0 ? "You owe more than you're owed" : "All balanced out"}
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

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
        </div>

        <div className="toolbar-bottom">
          <div className="filter-group">
            {[['outstanding','Outstanding'],['settled','Settled'],['all','All']].map(([v,l]) => (
              <button key={v} className={`filter-tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          <div className="filter-group">
            {[['all','All'],['money','Money'],['favor','Favors']].map(([v,l]) => (
              <button key={v} className={`filter-tab${typeFilter === v ? ' active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
            ))}
          </div>
          <div className="toolbar-end">
            <span className="count-badge">{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</span>
            {filter === 'settled' && settledCount > 0 && (
              <button className="btn-clear-settled" onClick={handleClearSettled}>
                Clear all settled
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⇌</div>
            {search ? (
              <>
                <h3>No results for "{search}"</h3>
                <p>Try searching a different name or description</p>
              </>
            ) : filter === 'settled' ? (
              <>
                <h3>No settled entries yet</h3>
                <p>Settled debts will appear here</p>
              </>
            ) : (
              <>
                <h3>No debts tracked yet</h3>
                <p>Hit "+ Add Entry" to log your first debt or favor</p>
                <button className="btn-add-empty" onClick={openCreate}>+ Add your first entry</button>
              </>
            )}
          </div>
        ) : (
          filtered.map(entry => {
            const isMoney = entry.type === 'money'
            const theyOweMe = entry.direction === 'they-owe-me'
            const settled = entry.status === 'settled'

            return (
              <div key={entry.id} className={`entry-card ${settled ? 'settled' : theyOweMe ? 'owed-to-me' : 'i-owe'}`}>
                <div className="avatar" style={{ background: avatarColor(entry.person) }}>
                  {initials(entry.person)}
                </div>

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

                {isMoney && (
                  <div className={`entry-amount ${settled ? '' : theyOweMe ? 'green' : 'red'}`}>
                    {theyOweMe ? '+' : '-'}{formatMoney(entry.amount)}
                  </div>
                )}

                <div className="entry-actions">
                  {!settled ? (
                    <button className="btn-settle" onClick={() => handleSettle(entry.id)} title="Mark as settled">✓</button>
                  ) : (
                    <button className="btn-unsettle" onClick={() => handleUnsettle(entry.id)} title="Reopen">↩</button>
                  )}
                  <button className="btn-icon" onClick={() => openEdit(entry)} title="Edit">✎</button>
                  <button className="btn-icon delete" onClick={() => openDelete(entry)} title="Delete">✕</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Help Modal ── */}
      {showHelp && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowHelp(false)}>
          <div className="modal help-modal">
            <div className="modal-header">
              <h2 className="modal-title">How to use OWED</h2>
              <button className="btn-close" onClick={() => setShowHelp(false)}>×</button>
            </div>
            <div className="help-steps">
              {STEPS.map(s => (
                <div className="help-step" key={s.num}>
                  <div className="help-step-icon">{s.icon}</div>
                  <div>
                    <div className="help-step-title">{s.title}</div>
                    <div className="help-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="help-tips">
              <div className="help-tip">💡 <strong>Green ✓</strong> = mark as settled. The entry stays in history.</div>
              <div className="help-tip">💡 <strong>↩</strong> = reopen a settled entry if disputed.</div>
              <div className="help-tip">💡 All data is saved in your browser — private and offline.</div>
            </div>
            <button className="btn-save" onClick={() => setShowHelp(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* ── CRUD Modal ── */}
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
