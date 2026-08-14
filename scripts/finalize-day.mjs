// Runs once daily via .github/workflows/finalize-day.yml.
// Scores any unfinalized past day, even if nobody opens the site that morning.

import { binUrls, getBin, putBin, normalizeState, normalizeSubState } from './jsonbin.mjs';
import { finalizeCheck } from './finalize.mjs';

async function run() {
  const { apiKey, mainUrl, submissionsUrl } = binUrls();

  const state = normalizeState(await getBin(mainUrl, apiKey));
  const subState = normalizeSubState(await getBin(submissionsUrl, apiKey));

  const touched = finalizeCheck(state, subState);

  if (touched) {
    await putBin(mainUrl, apiKey, state);
    console.log('Finalized at least one day — saved updated state.');
  } else {
    console.log('Nothing needed finalizing.');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
