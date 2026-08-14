// Small wrapper around the JSONBin v3 API — single bin only.

export function binUrl() {
  const { JSONBIN_API_KEY, JSONBIN_BIN_ID } = process.env;
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
    throw new Error('Missing JSONBIN_API_KEY or JSONBIN_BIN_ID env vars.');
  }
  return {
    apiKey: JSONBIN_API_KEY,
    url: `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`
  };
}

export async function getBin(url, apiKey) {
  const res = await fetch(`${url}/latest`, { headers: { 'X-Master-Key': apiKey } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record;
}

export async function putBin(url, apiKey, record) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error(`Failed to save ${url}: ${res.status} ${await res.text()}`);
}

export function normalizeState(state) {
  if (!state.players) state.players = ['Tanner', 'Thomas', 'Nathan', 'Jake', 'Michaela'];
  if (!state.entries) state.entries = [];
  if (!state.submissions) state.submissions = [];
  if (!state.finalizedDates) state.finalizedDates = [];
  return state;
}
