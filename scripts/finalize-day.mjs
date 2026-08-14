// Runs once daily via .github/workflows/finalize-day.yml.
// Scores any unfinalized past day, even if nobody opens the site that morning.

import { binUrl, getBin, putBin, normalizeState } from './jsonbin.mjs';
import { finalizeCheck } from './finalize.mjs';

async function run() {
  const { apiKey, url } = binUrl();

  const state = normalizeState(await getBin(url, apiKey));
  const touched = finalizeCheck(state);

  if (touched) {
    await putBin(url, apiKey, state);
    console.log('Finalized at least one day — saved updated state.');
  } else {
    console.log('Nothing needed finalizing.');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
