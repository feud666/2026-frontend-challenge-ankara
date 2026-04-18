import { useEffect, useMemo, useState } from 'react';
import { fetchAllRecords, getSuspects, getPeople, parseTs } from './api';
import './App.css';
import MapView from './MapView.jsx';

// ─── Constants ──────────────────────────────────────────────────────────
const TYPE_LABELS = {
  checkin: 'Check-in', message: 'Message', sighting: 'Sighting',
  note: 'Note', tip: 'Tip',
};
const TYPE_COLORS = {
  checkin: '#378ADD', message: '#D4537E', sighting: '#1D9E75',
  note: '#7F77DD', tip: '#EF9F27',
};
const TARGET = 'Podo';

// ─── Helpers ────────────────────────────────────────────────────────────
const formatTime = (ts) => {
  const d = parseTs(ts);
  if (!d) return ts || '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

// ─── Small components ───────────────────────────────────────────────────
function Badge({ type }) {
  const color = TYPE_COLORS[type] || '#888';
  return (
    <span className="badge" style={{ background: color + '22', color }}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function SuspectCard({ suspect, rank, isTop, selected, onClick }) {
  const maxBarScore = 30; // rough scale for the progress bar
  return (
    <button
      className={`suspect ${selected ? 'selected' : ''} ${isTop ? 'top' : ''}`}
      onClick={onClick}
    >
      <div className="suspect-head">
        <span className="suspect-rank">#{rank}</span>
        <span className="suspect-name">{suspect.name}</span>
        <span className="suspect-score">{suspect.score}</span>
      </div>
      <div className="suspect-bar">
        <div
          className="suspect-bar-fill"
          style={{ width: `${Math.min(100, (suspect.score / maxBarScore) * 100)}%` }}
        />
      </div>
      <div className="suspect-meta">
        {suspect.tips}t · {suspect.sightings}s · {suspect.messages}m
        {suspect.aliases.length > 0 && (
          <span className="suspect-aliases"> · aka {suspect.aliases.join(', ')}</span>
        )}
      </div>
    </button>
  );
}

function TimelineItem({ record, selected, onClick }) {
  return (
    <button
      id={`record-${record.id}`}
      className={`tl-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="tl-dot" style={{ background: TYPE_COLORS[record.type] }} />
      <div className="tl-body">
        <div className="tl-head">
          <span className="tl-time">{formatTime(record.timestamp)}</span>
          <Badge type={record.type} />
          {record.location && <span className="tl-loc">{record.location}</span>}
          {record.metadata?.confidence && (
            <span className={`conf conf-${record.metadata.confidence}`}>
              {record.metadata.confidence}
            </span>
          )}
        </div>
        {record.people.length > 0 && (
          <div className="tl-people">
            {record.people.map((p) => (
              <span key={p} className={`chip ${p.toLowerCase() === 'podo' ? 'chip-target' : ''}`}>
                {p}
              </span>
            ))}
          </div>
        )}
        {record.content && <div className="tl-content">{record.content}</div>}
      </div>
    </button>
  );
}

function DetailPanel({ record, suspect, records, onClose }) {
  const knownAssociates = useMemo(() => {
    if (!suspect || !records) return [];

    const counts = {};
    const suspectEvidenceIds = suspect.evidence.map(e => e.recordId);

    records.forEach(r => {
      if (suspectEvidenceIds.includes(r.id)) {
        r.people.forEach(p => {
          const nameLower = p.toLowerCase();
          const isTarget = nameLower === 'podo';
          const isSuspect = nameLower === suspect.name.toLowerCase() || 
                            suspect.aliases.some(a => a.toLowerCase() === nameLower);
          
          // If it's not Podo and not the suspect themselves, count them!
          if (!isTarget && !isSuspect) {
            counts[p] = (counts[p] || 0) + 1;
          }
        });
      }
    });

    // Sort by who they are seen with the most
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [suspect, records]);
  if (!record && !suspect) {
    return (
      <div className="detail empty-detail">
        <p>Click any record or suspect for details</p>
      </div>
    );
  }

  if (suspect) {
    return (
      <div className="detail">
        <div className="detail-head">
          <h3>{suspect.name}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="detail-stats">
          <div><span className="sl">Score</span><span className="sv">{suspect.score}</span></div>
          <div><span className="sl">Tips</span><span className="sv">{suspect.tips}</span></div>
          <div><span className="sl">Sightings</span><span className="sv">{suspect.sightings}</span></div>
          <div><span className="sl">Messages</span><span className="sv">{suspect.messages}</span></div>
        </div>
        {suspect.aliases.length > 0 && (
          <div className="detail-section">
            <h4>Also known as</h4>
            <div className="aliases-list">{suspect.aliases.join(' · ')}</div>
          </div>
        )}
        {knownAssociates.length > 0 && (
          <div className="detail-section">
            <h4>Known Associates</h4>
            <div className="people-chips">
              {knownAssociates.map(a => (
                <span key={a.name} className="chip">
                  {a.name} <span style={{ opacity: 0.6, marginLeft: '4px' }}>×{a.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="detail-section">
          <h4>Evidence trail ({suspect.evidence.length})</h4>
          <ul className="evidence">
            {suspect.evidence.map((e, i) => (
              <li key={i}>
                <Badge type={e.type} />
                {e.confidence && (
                  <span className={`conf conf-${e.confidence}`}>
                    {e.confidence} (×{e.weight})
                  </span>
                )}
                <span className="ev-id">{e.recordId.slice(-8)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="detail">
      <div className="detail-head">
        <Badge type={record.type} />
        <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="detail-time">{formatTime(record.timestamp)}</div>
      {record.location && <div className="detail-loc">{record.location}</div>}

      {record.people.length > 0 && (
        <div className="detail-section">
          <h4>People</h4>
          <div className="people-chips">
            {record.people.map((p) => <span key={p} className="chip">{p}</span>)}
          </div>
        </div>
      )}

      {record.content && (
        <div className="detail-section">
          <h4>Content</h4>
          <p className="detail-content">{record.content}</p>
        </div>
      )}

      {record.coordinates && (
        <div className="detail-section">
          <h4>Coordinates</h4>
          <div className="mono-small">
            {record.coordinates.lat.toFixed(5)}, {record.coordinates.lng.toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────
export default function App() {
  const [records, setRecords] = useState(null);
  const [suspects, setSuspects] = useState(null);
  const [people, setPeople] = useState(null);
  const [error, setError] = useState(null);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [filterPerson, setFilterPerson] = useState(TARGET);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (selectedRecord) {
      const element = document.getElementById(`record-${selectedRecord.id}`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
    }
  }, [selectedRecord]);
  useEffect(() => {
    Promise.all([fetchAllRecords(), getSuspects(), getPeople()])
      .then(([r, s, p]) => { setRecords(r); setSuspects(s); setPeople(p); })
      .catch(setError);
  }, []);

  // Filter the timeline view
  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterPerson.trim()) {
      const f = filterPerson.toLocaleLowerCase('tr-TR').trim();
      r = r.filter((rec) =>
        rec.people.some((p) => p.toLocaleLowerCase('tr-TR').includes(f))
      );
    }
    if (typeFilter !== 'all') r = r.filter((rec) => rec.type === typeFilter);
    if (search.trim()) {
      const s = search.toLocaleLowerCase('tr-TR');
      r = r.filter((rec) =>
        rec.content?.toLocaleLowerCase('tr-TR').includes(s) ||
        rec.location?.toLocaleLowerCase('tr-TR').includes(s) ||
        rec.people.some((p) => p.toLocaleLowerCase('tr-TR').includes(s))
      );
    }
    return r;
  }, [records, filterPerson, typeFilter, search]);

  // Last known location of Podo
  const lastKnown = useMemo(() => {
    if (!records) return null;
    const podoRecs = records.filter(r => r.people.some(p => p.toLowerCase() === 'podo'));
    if (podoRecs.length === 0) return null;
    const last = podoRecs[podoRecs.length - 1];
    const others = last.people.filter(p => p.toLowerCase() !== 'podo');
    return { 
      record: last, 
      with: others.length > 0 ? others.join(', ') : 'Alone' 
    };
  }, [records]);

  // Loading state
  if (error) {
    return (
      <div className="state-screen">
        <h2>Something went wrong</h2>
        <pre>{error.message}</pre>
        <p>Check your VITE_JOTFORM_API_KEY in .env and restart the dev server.</p>
      </div>
    );
  }
  if (!records) {
    return (
      <div className="state-screen">
        <div className="spinner" />
        <p>Loading case files…</p>
      </div>
    );
  }

  const topSuspect = suspects[0];

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>Missing Podo <span className="subtle">· Ankara case</span></h1>
          <p className="sub">
            {records.length} records across 5 sources · {people.length} people
            {topSuspect && <> · prime suspect <strong className="accent">{topSuspect.name}</strong></>}
          </p>
        </div>
        <div className="stat-pills">
          <span className="stat-pill accent">{records.length} records</span>
          <span className="stat-pill">{people.length} people</span>
          <button 
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      {lastKnown && (
              <div className="alert-banner">
                <div className="alert-icon">🚨</div>
                <div className="alert-content">
                  <h3>Last Known Status</h3>
                  <p>
                    Podo was last recorded on <span className="alert-highlight">{formatTime(lastKnown.record.timestamp)}</span> at <span className="alert-highlight">{lastKnown.record.location}</span>. 
                    {lastKnown.with !== 'Alone' && <> Seen with: <span className="alert-highlight">{lastKnown.with}</span>.</>}
                  </p>
                </div>
                <button 
                  className="chip chip-target alert-btn" 
                  onClick={() => {
                    setSelectedRecord(lastKnown.record);
                    setSelectedSuspect(null);
                    // Optional: if you add scrolling later, you can trigger it here!
                  }}
                >
                  View Evidence
                </button>
              </div>
            )}
      <div className="grid">
        {/* ── Left sidebar ─────────────────────────────────────────── */}
        <aside className="sidebar">
          <section className="panel">
            <h2>Suspicion ranking</h2>
            {suspects.slice(0, 8).map((s, i) => (
              <SuspectCard
                key={s.key}
                suspect={s}
                rank={i + 1}
                isTop={i === 0}
                selected={selectedSuspect?.key === s.key}
                onClick={() => {
                  setSelectedSuspect(s);
                  setSelectedRecord(null);
                  setFilterPerson(s.name);
                }}
              />
            ))}
          </section>

          <section className="panel">
            <h2>Filters</h2>
            <input
              className="inp"
              type="text"
              placeholder="Search content, location, people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="inp"
              type="text"
              placeholder="Filter by person"
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
            />
            <div className="type-filters">
              {['all', 'checkin', 'sighting', 'message', 'note', 'tip'].map((t) => (
                <button
                  key={t}
                  className={`type-btn ${typeFilter === t ? 'active' : ''}`}
                  onClick={() => setTypeFilter(t)}
                  style={t !== 'all' && typeFilter === t
                    ? { background: TYPE_COLORS[t] + '30', borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] }
                    : {}}
                >
                  {t === 'all' ? 'All' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </section>
        </aside>

{/* ── Center timeline ──────────────────────────────────────── */}
        <main className="panel timeline-panel">
          <div className="tl-panel-head">
            <h2>Timeline {filterPerson && <span className="subtle">· {filterPerson}</span>}</h2>
            <span className="count">{filtered.length} records</span>
          </div>

          {/* ADD THE MAP HERE */}
          <MapView 
            records={filtered} 
            selectedRecord={selectedRecord}
            darkMode={darkMode}
            onSelectRecord={(r) => {
              setSelectedRecord(r);
              setSelectedSuspect(null);
            }} 
          />

          {filtered.length === 0 ? (
            <p className="empty-state">No records match the current filters</p>
          ) : (
            <div className="timeline">
              {filtered.map((r) => (
                <TimelineItem
                  key={r.id}
                  record={r}
                  selected={selectedRecord?.id === r.id}
                  onClick={() => {
                    setSelectedRecord(r);
                    setSelectedSuspect(null);
                  }}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Right detail ─────────────────────────────────────────── */}
        <aside className="detail-wrap">
          <DetailPanel
            records={records}
            record={selectedRecord}
            suspect={selectedSuspect}
            onClose={() => { setSelectedRecord(null); setSelectedSuspect(null); }}
          />
        </aside>
      </div>
    </div>
  );
}
