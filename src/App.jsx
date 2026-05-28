import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import './App.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { person: '', type: 'money', direction: 'they-owe-me', amount: '', description: '' }

const TOUR_STEPS = [
  {
    target: null,
    placement: 'center',
    title: 'Welcome to OWED 👋',
    body: 'The smartest way to track money and favors between friends — so you always know exactly who owes who. Let me walk you through it.',
    cta: "Let's go →",
  },
  {
    target: 'hero',
    placement: 'bottom',
    title: 'Your Dashboard',
    body: 'The big number is your net balance — how much you\'re owed minus what you owe. The four cards below break it down further. Everything updates live.',
    cta: 'Got it →',
  },
  {
    target: 'add-btn',
    placement: 'bottom-left',
    title: 'Add a Debt or Favor',
    body: 'This button logs a new entry. You can track cash AND non-monetary favors — like someone helping you move or covering your dinner tab.',
    cta: 'Makes sense →',
    pulse: true,
  },
  {
    target: 'toolbar',
    placement: 'bottom',
    title: 'Filter, Sort & Search',
    body: 'Filter by Outstanding or Settled, filter by Money or Favors, sort by date or amount, and search by name or description — all right here.',
    cta: 'Cool →',
  },
  {
    target: 'people',
    placement: 'bottom',
    title: 'People Summary',
    body: 'Every person you have a balance with appears here. Click their card to filter entries to just that person. Great for settling up one-by-one.',
    cta: 'Nice →',
  },
  {
    target: 'help-btn',
    placement: 'bottom-left',
    title: 'Help is Always Here',
    body: 'Tap "?" any time to replay this tour or review how things work. Nothing gets buried.',
    cta: 'One more →',
  },
  {
    target: null,
    placement: 'center',
    title: "You're all set! 🎉",
    body: 'All data is saved privately in your browser — nothing is sent anywhere. Start by logging your first entry.',
    cta: 'Start Tracking',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function useLocalStorage(key, init) {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init } catch { return init }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, setState]
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function fmt$(n) { return '$' + parseFloat(n).toFixed(2) }

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const AV_COLORS = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#6366f1','#ec4899','#8b5cf6','#14b8a6','#f59e0b']
function avColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AV_COLORS[Math.abs(h) % AV_COLORS.length]
}

// ── Tour Component ────────────────────────────────────────────────────────────

const SPOT_PAD = 10

function Tour({ onDone }) {
  const [step, setStep] = useState(0)
  const [spot, setSpot] = useState(null)
  const [tipStyle, setTipStyle] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
  const [arrowDir, setArrowDir] = useState('')

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  const calcLayout = useCallback(() => {
    if (!current.target) {
      setSpot(null)
      setTipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      setArrowDir('')
      return
    }

    const el = document.querySelector(`[data-tour="${current.target}"]`)
    if (!el) {
      setSpot(null)
      setTipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      setArrowDir('')
      return
    }

    const r = el.getBoundingClientRect()
    const P = SPOT_PAD
    setSpot({ top: r.top - P, left: r.left - P, width: r.width + P * 2, height: r.height + P * 2 })

    const TW = 320
    const GAP = 16
    const vw = window.innerWidth

    if (current.placement === 'bottom') {
      setTipStyle({
        position: 'fixed',
        top: r.bottom + P + GAP,
        left: Math.max(16, Math.min(r.left + r.width / 2 - TW / 2, vw - TW - 16)),
        width: TW,
      })
      setArrowDir('arrow-up')
    } else if (current.placement === 'bottom-left') {
      setTipStyle({
        position: 'fixed',
        top: r.bottom + P + GAP,
        right: Math.max(16, vw - r.right - P),
        width: TW,
      })
      setArrowDir('arrow-up-right')
    }
  }, [step, current])

  useEffect(() => {
    if (!current.target) {
      setSpot(null)
      setTipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      setArrowDir('')
      return
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(calcLayout, 380)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    window.addEventListener('resize', calcLayout)
    return () => window.removeEventListener('resize', calcLayout)
  }, [calcLayout])

  function advance() {
    if (isLast) onDone()
    else setStep(s => s + 1)
  }

  return (
    <>
      {/* Click-blocking overlay */}
      <div className="tour-block" />

      {/* Spotlight cutout */}
      {spot && <div className="tour-spot" style={spot} />}

      {/* Tooltip */}
      <div
        className={`tour-tip ${arrowDir}`}
        style={{ position: 'fixed', zIndex: 10002, ...tipStyle }}
      >
        <div className="tour-tip-top">
          <span className="tour-count">{step + 1} of {TOUR_STEPS.length}</span>
          <button className="tour-skip" onClick={onDone}>Skip</button>
        </div>

        <h3 className="tour-tip-title">{current.title}</h3>
        <p className="tour-tip-body">{current.body}</p>

        <div className="tour-tip-bottom">
          <div className="tour-dots">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`tour-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
            ))}
          </div>
          <button className="tour-cta" onClick={advance}>{current.cta}</button>
        </div>
      </div>
    </>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [entries, setEntries] = useLocalStorage('owed-entries', [])
  const [onboarded, setOnboarded] = useLocalStorage('owed-onboarded', false)
  const [showHelp, setShowHelp] = useState(false)
  const [filter, setFilter] = useState('outstanding')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [personFilter, setPersonFilter] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [target, setTarget] = useState(null)
  const [copied, setCopied] = useState(false)

  // ── Stats ──
  const stats = useMemo(() => {
    const out = entries.filter(e => e.status === 'outstanding')
    const owedToMe = out.filter(e => e.direction === 'they-owe-me' && e.type === 'money').reduce((s, e) => s + Number(e.amount), 0)
    const iOwe = out.filter(e => e.direction === 'i-owe-them' && e.type === 'money').reduce((s, e) => s + Number(e.amount), 0)
    const favorsOwed = out.filter(e => e.type === 'favor' && e.direction === 'they-owe-me').length
    const iOweFavors = out.filter(e => e.type === 'favor' && e.direction === 'i-owe-them').length
    return { owedToMe, iOwe, net: owedToMe - iOwe, favorsOwed, iOweFavors }
  }, [entries])

  // ── People summary ──
  const people = useMemo(() => {
    const out = entries.filter(e => e.status === 'outstanding')
    const map = {}
    out.forEach(e => {
      if (!map[e.person]) map[e.person] = { name: e.person, money: 0, favors: 0 }
      if (e.type === 'money') {
        map[e.person].money += e.direction === 'they-owe-me' ? Number(e.amount) : -Number(e.amount)
      } else {
        map[e.person].favors += e.direction === 'they-owe-me' ? 1 : -1
      }
    })
    return Object.values(map).sort((a, b) => Math.abs(b.money) - Math.abs(a.money))
  }, [entries])

  // ── Filtered + sorted list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = entries.filter(e => {
      if (filter === 'outstanding' && e.status !== 'outstanding') return false
      if (filter === 'settled' && e.status !== 'settled') return false
      if (typeFilter === 'money' && e.type !== 'money') return false
      if (typeFilter === 'favor' && e.type !== 'favor') return false
      if (personFilter && e.person !== personFilter) return false
      if (q && !e.person.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false
      return true
    })
    list = [...list]
    if (sort === 'newest')  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sort === 'oldest')  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    if (sort === 'amount-hi') list.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    if (sort === 'amount-lo') list.sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))
    if (sort === 'name')    list.sort((a, b) => a.person.localeCompare(b.person))
    return list
  }, [entries, filter, typeFilter, sort, search, personFilter])

  // ── Handlers ──
  function openCreate() { setForm(EMPTY_FORM); setTarget(null); setModal('create') }
  function openEdit(e) {
    setForm({ person: e.person, type: e.type, direction: e.direction, amount: e.amount ?? '', description: e.description })
    setTarget(e); setModal('edit')
  }
  function openDelete(e) { setTarget(e); setModal('delete') }
  function closeModal() { setModal(null); setTarget(null); setForm(EMPTY_FORM) }

  function handleSave() {
    const valid = form.person.trim() && form.description.trim() &&
      (form.type === 'favor' || (form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0))
    if (!valid) return
    if (modal === 'create') {
      setEntries(prev => [{
        id: crypto.randomUUID(), person: form.person.trim(), type: form.type,
        direction: form.direction, amount: form.type === 'money' ? Number(form.amount) : null,
        description: form.description.trim(), status: 'outstanding',
        createdAt: new Date().toISOString(), settledAt: null,
      }, ...prev])
    } else {
      setEntries(prev => prev.map(e => e.id === target.id ? {
        ...e, person: form.person.trim(), type: form.type, direction: form.direction,
        amount: form.type === 'money' ? Number(form.amount) : null, description: form.description.trim(),
      } : e))
    }
    closeModal()
  }

  function handleSettle(id) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'settled', settledAt: new Date().toISOString() } : e))
  }
  function handleUnsettle(id) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'outstanding', settledAt: null } : e))
  }
  function handleDelete() { setEntries(prev => prev.filter(e => e.id !== target.id)); closeModal() }
  function handleClearSettled() { setEntries(prev => prev.filter(e => e.status !== 'settled')) }

  function handleCopySummary() {
    const out = entries.filter(e => e.status === 'outstanding')
    if (!out.length) return
    const lines = [`OWED — Summary (${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`, '']
    const byPerson = {}
    out.forEach(e => { if (!byPerson[e.person]) byPerson[e.person] = []; byPerson[e.person].push(e) })
    Object.entries(byPerson).forEach(([person, list]) => {
      lines.push(`${person}:`)
      list.forEach(e => {
        const who = e.direction === 'they-owe-me' ? 'owes you' : 'you owe'
        const what = e.type === 'money' ? fmt$(e.amount) : 'a favor'
        lines.push(`  • ${who} ${what} — ${e.description}`)
      })
      lines.push('')
    })
    lines.push(`Net balance: ${stats.net >= 0 ? '+' : ''}${fmt$(stats.net)}`)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const settledCount = entries.filter(e => e.status === 'settled').length
  const isFormValid = form.person.trim() && form.description.trim() &&
    (form.type === 'favor' || (form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0))

  return (
    <div className="app" onKeyDown={e => e.key === 'Escape' && (modal ? closeModal() : setShowHelp(false))}>

      {/* ── Guided Tour ── */}
      {!onboarded && <Tour onDone={() => setOnboarded(true)} />}

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
          <button
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopySummary}
            title="Copy summary to clipboard"
            disabled={!entries.filter(e => e.status === 'outstanding').length}
          >
            {copied ? '✓ Copied!' : '⎘ Copy Summary'}
          </button>
          <button className="btn-help" data-tour="help-btn" onClick={() => setShowHelp(true)} title="How to use">?</button>
          <button className="btn-add" data-tour="add-btn" onClick={openCreate}>+ Add Entry</button>
        </div>
      </header>

      {/* ── Hero / Balance ── */}
      <div className="hero-section" data-tour="hero">
        <div className={`net-balance ${stats.net > 0 ? 'positive' : stats.net < 0 ? 'negative' : 'neutral'}`}>
          <div className="net-label">Net Balance</div>
          <div className="net-amount">{stats.net > 0 ? '+' : ''}{fmt$(stats.net)}</div>
          <div className="net-sub">
            {stats.net > 0 ? "You're owed more than you owe" : stats.net < 0 ? "You owe more than you're owed" : "All balanced out"}
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-card green"><div className="stat-value">{fmt$(stats.owedToMe)}</div><div className="stat-label">Owed to you</div></div>
          <div className="stat-card red"><div className="stat-value">{fmt$(stats.iOwe)}</div><div className="stat-label">You owe</div></div>
          <div className="stat-card purple"><div className="stat-value">{stats.favorsOwed}</div><div className="stat-label">Favors owed you</div></div>
          <div className="stat-card orange"><div className="stat-value">{stats.iOweFavors}</div><div className="stat-label">Favors you owe</div></div>
        </div>
      </div>

      {/* ── People Summary ── */}
      {people.length > 0 && (
        <div className="people-section" data-tour="people">
          <div className="people-header">
            <span className="people-title">People</span>
            {personFilter && (
              <button className="people-clear" onClick={() => setPersonFilter(null)}>
                × Clear filter
              </button>
            )}
          </div>
          <div className="people-row">
            {people.map(p => (
              <button
                key={p.name}
                className={`person-chip ${personFilter === p.name ? 'active' : ''} ${p.money > 0 ? 'green' : p.money < 0 ? 'red' : 'purple'}`}
                onClick={() => setPersonFilter(prev => prev === p.name ? null : p.name)}
              >
                <div className="person-chip-av" style={{ background: avColor(p.name) }}>{initials(p.name)}</div>
                <div className="person-chip-info">
                  <span className="person-chip-name">{p.name}</span>
                  <span className="person-chip-val">
                    {p.type !== 'favor' && p.money !== 0 && `${p.money > 0 ? '+' : ''}${fmt$(p.money)}`}
                    {p.favors !== 0 && ` ${p.favors > 0 ? '+' : ''}${Math.abs(p.favors)} favor${Math.abs(p.favors) > 1 ? 's' : ''}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="toolbar" data-tour="toolbar">
        <div className="search-wrap" data-tour="search">
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
        <div className="toolbar-controls">
          <div className="filter-group">
            {[['outstanding','Outstanding'],['settled','Settled'],['all','All']].map(([v, l]) => (
              <button key={v} className={`filter-tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          <div className="filter-group">
            {[['all','All'],['money','Money'],['favor','Favors']].map(([v, l]) => (
              <button key={v} className={`filter-tab${typeFilter === v ? ' active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
            ))}
          </div>
          <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-hi">Amount: high → low</option>
            <option value="amount-lo">Amount: low → high</option>
            <option value="name">Name: A → Z</option>
          </select>
          <div className="toolbar-end">
            <span className="count-badge">{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</span>
            {filter === 'settled' && settledCount > 0 && (
              <button className="btn-clear-settled" onClick={handleClearSettled}>Clear all</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Entry List ── */}
      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⇌</div>
            {search || personFilter ? (
              <><h3>No results found</h3><p>Try adjusting your search or filters</p></>
            ) : filter === 'settled' ? (
              <><h3>No settled entries yet</h3><p>Settled debts will appear here</p></>
            ) : (
              <><h3>No debts tracked yet</h3><p>Hit "+ Add Entry" to log your first debt or favor</p>
                <button className="btn-add-empty" onClick={openCreate}>+ Add your first entry</button></>
            )}
          </div>
        ) : filtered.map(entry => {
          const isMoney = entry.type === 'money'
          const theyOweMe = entry.direction === 'they-owe-me'
          const settled = entry.status === 'settled'
          return (
            <div key={entry.id} className={`entry-card ${settled ? 'settled' : theyOweMe ? 'owed-to-me' : 'i-owe'}`}>
              <div className="avatar" style={{ background: avColor(entry.person) }}>{initials(entry.person)}</div>
              <div className="entry-body">
                <div className="entry-top">
                  <span className="entry-person">{entry.person}</span>
                  <span className={`dir-badge ${theyOweMe ? 'green' : 'red'}`}>{theyOweMe ? '← owes you' : '→ you owe'}</span>
                </div>
                <div className="entry-desc">{entry.description}</div>
                <div className="entry-meta">
                  <span className={`type-chip${isMoney ? '' : ' favor'}`}>{isMoney ? '💵 Money' : '🤝 Favor'}</span>
                  <span className="entry-date">{fmtDate(entry.createdAt)}</span>
                  {settled && entry.settledAt && <span className="settled-badge">✓ Settled {fmtDate(entry.settledAt)}</span>}
                </div>
              </div>
              {isMoney && (
                <div className={`entry-amount ${settled ? '' : theyOweMe ? 'green' : 'red'}`}>
                  {theyOweMe ? '+' : '-'}{fmt$(entry.amount)}
                </div>
              )}
              <div className="entry-actions">
                {!settled
                  ? <button className="btn-settle" onClick={() => handleSettle(entry.id)} title="Mark settled">✓</button>
                  : <button className="btn-unsettle" onClick={() => handleUnsettle(entry.id)} title="Reopen">↩</button>
                }
                <button className="btn-icon" onClick={() => openEdit(entry)} title="Edit">✎</button>
                <button className="btn-icon delete" onClick={() => openDelete(entry)} title="Delete">✕</button>
              </div>
            </div>
          )
        })}
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
              {[
                { icon: '＋', title: 'Add an entry', desc: 'Click "+ Add Entry". Choose Money or Favor, set direction, fill the details.' },
                { icon: '⇄', title: 'Net balance updates live', desc: 'The big number at the top always reflects your current position.' },
                { icon: '✓', title: 'Settle up', desc: 'Hit the green ✓ on any card when a debt is repaid. History is preserved.' },
                { icon: '↩', title: 'Reopen if disputed', desc: 'Use ↩ to move a settled entry back to outstanding.' },
                { icon: '⎘', title: 'Copy summary', desc: 'Use "Copy Summary" in the header to share a text breakdown via message.' },
              ].map(s => (
                <div className="help-step" key={s.title}>
                  <div className="help-step-icon">{s.icon}</div>
                  <div><div className="help-step-title">{s.title}</div><div className="help-step-desc">{s.desc}</div></div>
                </div>
              ))}
            </div>
            <button className="btn-save" style={{ alignSelf: 'flex-end' }} onClick={() => setShowHelp(false)}>Got it</button>
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
                <p className="confirm-text">Delete the entry with <strong>{target.person}</strong>? This can't be undone.</p>
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
                    <input autoFocus type="text" placeholder="Their name..." value={form.person}
                      onChange={e => setForm(f => ({ ...f, person: e.target.value }))} />
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
                  <button type="button"
                    className={`dir-btn${form.direction === 'they-owe-me' ? ' active green' : ''}`}
                    onClick={() => setForm(f => ({ ...f, direction: 'they-owe-me' }))}>
                    ← They owe me
                  </button>
                  <button type="button"
                    className={`dir-btn${form.direction === 'i-owe-them' ? ' active red' : ''}`}
                    onClick={() => setForm(f => ({ ...f, direction: 'i-owe-them' }))}>
                    → I owe them
                  </button>
                </div>

                {form.type === 'money' && (
                  <div className="field">
                    <label>Amount ($)</label>
                    <input type="number" placeholder="0.00" min="0" step="0.01" value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                )}

                <div className="field">
                  <label>What for?</label>
                  <input type="text"
                    placeholder={form.type === 'money' ? 'Dinner, concert tickets...' : 'Help moving, driving to airport...'}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
