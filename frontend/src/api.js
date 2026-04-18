// src/api.js — Missing Podo investigation dashboard
// Talks directly to api.jotform.com from the browser. No backend needed.
//
// Setup (Vite):
//   1. .env at project root:   VITE_JOTFORM_API_KEY=your_key_here
//   2. Restart `npm run dev` after editing .env
//   3. import { getSuspects, getTimeline, getPeople } from './api';
//
// Fuzzy name matching:
//   - Names are NFC-normalized and casefolded (Turkish-safe) so variants
//     like the two different "Kağan" unicode encodings collapse.
//   - A prefix-boundary rule then merges extensions: "Kağan A." → "Kağan".
//   - The canonical form (shortest observed variant) is used everywhere.
//   - The identity map exposes aliases so the UI can show what merged.

const API_KEY = import.meta.env.VITE_JOTFORM_API_KEY;
const BASE = 'https://api.jotform.com';
const TARGET = 'Podo';

const FORM_IDS = {
  checkin:  '261065067494966',
  message:  '261065765723966',
  sighting: '261065244786967',
  note:     '261065509008958',
  tip:      '261065875889981',
};

const CONFIDENCE_WEIGHT = { low: 1, medium: 2, high: 3 };
// Suspicion: (tip_confidence × 3) + (sightings × 2) + (messages × 1)
const WEIGHTS = { tip: 3, sighting: 2, message: 1 };

// ─── Low-level Jotform calls ────────────────────────────────────────────
async function jotform(path, params = {}) {
  if (!API_KEY) throw new Error('Missing VITE_JOTFORM_API_KEY in .env');
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('apiKey', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jotform ${res.status} on ${path}`);
  const json = await res.json();
  return json.content;
}

export const fetchForms = () => jotform('/user/forms');
export const fetchSubmissions = (formId, limit = 1000) =>
  jotform(`/form/${formId}/submissions`, { limit });

// ─── Parsing helpers ────────────────────────────────────────────────────
const ans = (sub, qid) => {
  const a = sub.answers?.[String(qid)]?.answer;
  return a ? String(a).trim() : '';
};

const parseCoords = (s) => {
  if (!s) return null;
  const [lat, lng] = s.split(',').map(parseFloat);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const parseTs = (s) => {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00`);
};

const splitPeople = (s) =>
  s ? s.split(',').map((p) => p.trim()).filter(Boolean) : [];

const normalizeName = (s) =>
  (s || '')
    .normalize('NFD')                 // split "ğ" into "g" + combining breve
    .replace(/[\u0300-\u036f]/g, '')  // drop the combining marks
    .toLowerCase()
    .replace(/ı/g, 'i')               // dotless i doesn't decompose, handle manually
    .trim();

// Is `longer` an extension of `shorter`? e.g. "kağan" → "kağan a."
// Requires word-boundary char (space, dot, comma) after the prefix to
// avoid false matches like "ali" → "aliye".
const isNameExtension = (shorter, longer) => {
  if (shorter.length >= longer.length) return false;
  if (!longer.startsWith(shorter)) return false;
  return /[\s.,]/.test(longer[shorter.length]);
};

// Build a canonical-identity resolver from all observed person names.
// Canonical form = shortest observed variant (after normalization).
function buildIdentityMap(records) {
  const observed = new Map(); // norm → { displays: Map<display,count>, total }
  for (const r of records) {
    for (const p of r.people) {
      const norm = normalizeName(p);
      if (!norm) continue;
      if (!observed.has(norm)) observed.set(norm, { displays: new Map(), total: 0 });
      const entry = observed.get(norm);
      const clean = p.normalize('NFC').trim();
      entry.displays.set(clean, (entry.displays.get(clean) || 0) + 1);
      entry.total++;
    }
  }

  // Shortest names first, so extensions resolve to them.
  const names = [...observed.keys()].sort((a, b) => a.length - b.length);
  const canonicalOf = new Map();
  for (const name of names) {
    let canon = name;
    for (const candidate of names) {
      if (candidate === name) break; // shorter names are earlier in the list
      if (isNameExtension(candidate, name)) {
        canon = canonicalOf.get(candidate) || candidate; // transitive
        break;
      }
    }
    canonicalOf.set(name, canon);
  }

  const aliases = new Map();   // canon → Set<alias>
  const displayOf = new Map(); // canon → best display string
  for (const [name, canon] of canonicalOf) {
    if (!aliases.has(canon)) aliases.set(canon, new Set());
    if (name !== canon) aliases.get(canon).add(name);
  }
  for (const canon of new Set(canonicalOf.values())) {
    const entry = observed.get(canon);
    const best = [...entry.displays.entries()].sort((a, b) => b[1] - a[1])[0];
    displayOf.set(canon, best ? best[0] : canon);
  }

  return {
    key:          (name) => canonicalOf.get(normalizeName(name)) || normalizeName(name),
    display:      (canon) => displayOf.get(canon) || canon,
    aliasesOf:    (canon) => [...(aliases.get(canon) || [])],
    allCanonical: () => [...displayOf.keys()],
  };
}

// ─── Normalization — all 5 forms → unified Record shape ────────────────
function normalize(rtype, subs) {
  return subs.map((sub) => {
    if (rtype === 'checkin') {
      const person = ans(sub, 2);
      return {
        id: sub.id, type: 'checkin',
        timestamp: ans(sub, 3),
        location: ans(sub, 4),
        coordinates: parseCoords(ans(sub, 5)),
        content: ans(sub, 6),
        people: person ? [person] : [],
        metadata: { person },
      };
    }
    if (rtype === 'message') {
      const sender = ans(sub, 2);
      const recipient = ans(sub, 3);
      return {
        id: sub.id, type: 'message',
        timestamp: ans(sub, 4),
        location: ans(sub, 5),
        coordinates: parseCoords(ans(sub, 6)),
        content: ans(sub, 7),
        people: [sender, recipient].filter(Boolean),
        metadata: { sender, recipient, urgency: ans(sub, 8) },
      };
    }
    if (rtype === 'sighting') {
      const person = ans(sub, 2);
      const seenWith = ans(sub, 3);
      return {
        id: sub.id, type: 'sighting',
        timestamp: ans(sub, 4),
        location: ans(sub, 5),
        coordinates: parseCoords(ans(sub, 6)),
        content: ans(sub, 7),
        people: [person, seenWith].filter(Boolean),
        metadata: { person, seenWith },
      };
    }
    if (rtype === 'note') {
      const author = ans(sub, 2);
      const mentioned = splitPeople(ans(sub, 7));
      const seen = new Set();
      const people = [author, ...mentioned].filter(Boolean).filter((p) => {
        const k = normalizeName(p);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return {
        id: sub.id, type: 'note',
        timestamp: ans(sub, 3),
        location: ans(sub, 4),
        coordinates: parseCoords(ans(sub, 5)),
        content: ans(sub, 6),
        people,
        metadata: { author, mentioned },
      };
    }
    if (rtype === 'tip') {
      const suspect = ans(sub, 5);
      return {
        id: sub.id, type: 'tip',
        timestamp: ans(sub, 2),
        location: ans(sub, 3),
        coordinates: parseCoords(ans(sub, 4)),
        content: ans(sub, 6),
        people: suspect ? [suspect] : [],
        metadata: { suspect, confidence: ans(sub, 7).toLowerCase() },
      };
    }
    return null;
  }).filter(Boolean);
}

// ─── Cache: records + identity map together ─────────────────────────────
let _cache = null; // Promise<{ records, identity }>

function _fetchAll(force = false) {
  if (_cache && !force) return _cache;
  _cache = (async () => {
    const chunks = await Promise.all(
      Object.entries(FORM_IDS).map(async ([rtype, id]) => {
        try { return normalize(rtype, await fetchSubmissions(id)); }
        catch (err) { console.warn(`[api] ${rtype}:`, err); return []; }
      })
    );
    const records = chunks.flat();
    records.sort((a, b) => {
      const da = parseTs(a.timestamp)?.getTime() ?? 0;
      const db = parseTs(b.timestamp)?.getTime() ?? 0;
      return da - db;
    });
    const identity = buildIdentityMap(records);
    return { records, identity };
  })();
  _cache.catch(() => { _cache = null; });
  return _cache;
}

export async function fetchAllRecords({ force = false } = {}) {
  return (await _fetchAll(force)).records;
}

export async function getIdentity() {
  return (await _fetchAll()).identity;
}

export function clearCache() { _cache = null; }

// ─── Derived queries ────────────────────────────────────────────────────
export async function getRecords({ person, type } = {}) {
  const { records, identity } = await _fetchAll();
  let recs = records;
  if (type) recs = recs.filter((r) => r.type === type);
  if (person) {
    const key = identity.key(person);
    recs = recs.filter((r) => r.people.some((p) => identity.key(p) === key));
  }
  return recs;
}

export async function getTimeline(person = TARGET) {
  const { records, identity } = await _fetchAll();
  const key = identity.key(person);
  return records.filter((r) => r.people.some((p) => identity.key(p) === key));
}

export async function getPeople() {
  const { records, identity } = await _fetchAll();
  const counts = new Map();
  for (const r of records) {
    const seen = new Set(); // don't double-count the same canonical within one record
    for (const p of r.people) {
      const k = identity.key(p);
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([k, v]) => ({
      name: identity.display(k),
      recordCount: v,
      aliases: identity.aliasesOf(k),
    }))
    .sort((a, b) => b.recordCount - a.recordCount);
}

export async function getSuspects() {
  const { records, identity } = await _fetchAll();
  const targetKey = identity.key(TARGET);
  const scores = new Map();

  const bump = (canon, delta, field, evidence) => {
    if (!canon || canon === targetKey) return;
    if (!scores.has(canon)) {
      scores.set(canon, {
        key: canon,
        name: identity.display(canon),
        aliases: identity.aliasesOf(canon),
        score: 0, tips: 0, sightings: 0, messages: 0,
        evidence: [],
      });
    }
    const s = scores.get(canon);
    s.score += delta;
    s[field] += 1;
    s.evidence.push(evidence);
  };

  for (const r of records) {
    if (r.type === 'tip') {
      const canon = identity.key(r.metadata.suspect);
      const confidence = r.metadata.confidence;
      const w = CONFIDENCE_WEIGHT[confidence] ?? 1;
      bump(canon, w * WEIGHTS.tip, 'tips',
        { recordId: r.id, type: 'tip', confidence, weight: w });
    } else if (r.type === 'sighting' || r.type === 'message') {
      const keys = r.people.map((p) => identity.key(p));
      if (!keys.includes(targetKey)) continue;
      const seen = new Set();
      for (const k of keys) {
        if (k === targetKey || seen.has(k)) continue;
        seen.add(k);
        bump(k, WEIGHTS[r.type], `${r.type}s`,
          { recordId: r.id, type: r.type });
      }
    }
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

export { parseTs, normalizeName };