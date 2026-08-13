// Ported from the client-side resolveName()/parseBulkLine() in index.html.
// Keep the two copies in sync if the format ever changes.

const NICKNAMES = { nate: 'Nathan' };

export function resolveName(state, raw) {
  const trimmed = String(raw).trim();
  const lower = trimmed.toLowerCase();
  if (NICKNAMES[lower]) return NICKNAMES[lower];
  const match = state.players.find(p => p.toLowerCase() === lower);
  if (match) return match;
  const titled = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!state.players.includes(titled)) state.players.push(titled);
  return titled;
}

function parseDateSlash(raw) {
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts.map(x => x.trim());
  if (y.length === 2) y = '20' + y;
  m = m.padStart(2, '0');
  d = d.padStart(2, '0');
  if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${m}-${d}`;
}

export function parseBulkLine(state, line) {
  const cleaned = String(line).trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s*:?\s+(.+?)\s*\(\s*(\d+)\s*(?:points?|pts?)\s*\)\s*$/i);
  if (!m) return { error: `Could not parse: "${cleaned}"` };
  const iso = parseDateSlash(m[1]);
  if (!iso) return { error: `Bad date: "${cleaned}"` };
  const names = m[2].split(',').map(n => resolveName(state, n));
  const points = Number(m[3]);
  if (names.length === 0 || Number.isNaN(points)) return { error: `Could not parse: "${cleaned}"` };
  return { date: iso, players: names, points };
}
