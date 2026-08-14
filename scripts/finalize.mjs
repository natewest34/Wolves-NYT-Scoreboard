// Shared with index.html's client-side finalizeCheck()/runFinalizeSweep() —
// keep this logic in sync with the copy in index.html if you change either.
//
// A day finalizes once either: everyone has submitted, OR the day has
// already passed (this script's job is to catch that second case overnight,
// for anyone who forgets to open the site the next day). Ties are recorded
// as a shared multi-winner entry — no live tiebreaker wheel here, since
// nobody's around at 12:15am to spin it.

function todayISO_Chicago() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

function submissionsForDate(subs, date) {
  return subs.filter(s => s.date === date);
}

// Mutates state in place. Returns true if anything changed (so the caller
// knows whether a save is needed).
export function finalizeCheck(state) {
  const today = todayISO_Chicago();
  const dates = new Set(state.submissions.map(s => s.date));

  let touched = false;

  for (const date of dates) {
    if (state.finalizedDates.includes(date)) continue;

    const isPast = date < today;
    const subs = submissionsForDate(state.submissions, date);
    const allIn = subs.length > 0 && subs.length >= state.players.length;

    if (!isPast && !allIn) continue; // not ready yet

    state.finalizedDates.push(date);
    touched = true;

    if (subs.length === 0) continue; // nobody submitted that day

    const max = Math.max(...subs.map(s => s.totalPoints));
    const winners = subs.filter(s => s.totalPoints === max).map(s => s.player);
    state.entries.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      date,
      players: winners,
      points: max
    });
  }

  return touched;
}
