// Triggered by .github/workflows/apply-write.yml on a `nyt-write`
// repository_dispatch event. The client never holds the JSONBin master key —
// it only holds a token that can trigger this workflow. Everything here is
// treated as untrusted input and validated before touching JSONBin.

import { binUrls, getBin, putBin, normalizeState, normalizeSubState } from './lib/jsonbin.mjs';
import { finalizeCheck } from './lib/finalize.mjs';
import { parseBulkLine } from './lib/parse.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_POINTS = 20;
const MIN_POINTS = -5;

function isValidPoints(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= MIN_POINTS && n <= MAX_POINTS;
}

function requireKnownPlayer(state, name) {
  if (typeof name !== 'string' || !state.players.includes(name)) {
    throw new Error(`Unknown player: ${JSON.stringify(name)}`);
  }
}

async function run() {
  const { apiKey, mainUrl, submissionsUrl } = binUrls();
  const action = process.env.ACTION;
  let payload;
  try {
    payload = JSON.parse(process.env.PAYLOAD || '{}');
  } catch {
    throw new Error('Payload was not valid JSON.');
  }

  const state = normalizeState(await getBin(mainUrl, apiKey));

  switch (action) {
    case 'submit-score': {
      if (!DATE_RE.test(payload.date)) throw new Error('Bad date.');
      requireKnownPlayer(state, payload.player);
      if (!isValidPoints(payload.totalPoints)) throw new Error('Bad points.');
      if ((state.finalizedDates || []).includes(payload.date)) {
        console.log(`${payload.date} is already finalized — ignoring late submission.`);
        return;
      }

      const subState = normalizeSubState(await getBin(submissionsUrl, apiKey));
      const raw = typeof payload.raw === 'string' ? payload.raw.slice(0, 3000) : null;
      const entry = {
        date: payload.date,
        player: payload.player,
        raw,
        wordlePoints: Number.isFinite(payload.wordlePoints) ? payload.wordlePoints : null,
        connectionsPoints: Number.isFinite(payload.connectionsPoints) ? payload.connectionsPoints : null,
        totalPoints: payload.totalPoints,
        submittedAt: new Date().toISOString()
      };
      const idx = subState.submissions.findIndex(s => s.date === entry.date && s.player === entry.player);
      if (idx >= 0) subState.submissions[idx] = entry; else subState.submissions.push(entry);
      await putBin(submissionsUrl, apiKey, subState);

      const touched = finalizeCheck(state, subState);
      if (touched) await putBin(mainUrl, apiKey, state);
      console.log(`Recorded submission: ${payload.player} on ${payload.date} (${payload.totalPoints} pts).`);
      break;
    }

    case 'add-entry': {
      if (!DATE_RE.test(payload.date)) throw new Error('Bad date.');
      if (!Array.isArray(payload.players) || payload.players.length === 0) throw new Error('No players given.');
      payload.players.forEach(p => requireKnownPlayer(state, p));
      if (!isValidPoints(payload.points)) throw new Error('Bad points.');

      state.entries.push({ id: Date.now(), date: payload.date, players: payload.players, points: payload.points });
      if (!state.finalizedDates.includes(payload.date)) state.finalizedDates.push(payload.date);
      await putBin(mainUrl, apiKey, state);
      console.log(`Added entry: ${payload.players.join(' & ')} on ${payload.date} (${payload.points} pts).`);
      break;
    }

    case 'remove-entry': {
      const id = Number(payload.id);
      if (!Number.isFinite(id)) throw new Error('Bad id.');
      const before = state.entries.length;
      state.entries = state.entries.filter(e => e.id !== id);
      if (state.entries.length === before) {
        console.log(`No entry found with id ${id} — nothing to remove.`);
        return;
      }
      await putBin(mainUrl, apiKey, state);
      console.log(`Removed entry ${id}.`);
      break;
    }

    case 'bulk-import': {
      if (!Array.isArray(payload.lines) || payload.lines.length === 0) throw new Error('No lines given.');
      if (payload.lines.length > 100) throw new Error('Too many lines (max 100 per import).');

      let added = 0;
      for (const rawLine of payload.lines) {
        const line = String(rawLine).slice(0, 300);
        const parsed = parseBulkLine(state, line);
        if (!parsed || parsed.error) continue;
        state.entries.push({ id: Date.now() + added, date: parsed.date, players: parsed.players, points: parsed.points });
        if (!state.finalizedDates.includes(parsed.date)) state.finalizedDates.push(parsed.date);
        added++;
      }
      await putBin(mainUrl, apiKey, state);
      console.log(`Bulk import added ${added} of ${payload.lines.length} line(s).`);
      break;
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
