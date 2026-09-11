/*
Ajomatkalaskuri.
Calculates the forwarding distance (metsäkuljetusmatka) of a single lohko when
the wood is driven to more than one landing. The distances are weighted by the
volume driven to each landing, as required by the work instruction:
"Useamman kuvion lohkolla kuvioiden puumäärillä punnittu lohkon keskiajomatka."
*/

/* --------- */
/* CONSTANTS */
/* --------- */

// Number of empty landing rows the calculator starts and resets with
const START_LANDING_COUNT = 2;

// The calculator always keeps at least this many rows on screen
const MIN_LANDING_COUNT = 1;

const INVALID_INPUT_MESSAGE =
  "Tarkista syötteet: puumäärän ja matkan pitää olla positiivisia lukuja.";


/* ----- */
/* STATE */
/* ----- */

// One entry per landing. Values are kept as raw input strings and only parsed
// when the result is calculated, so the user can type freely.
let landings = [];
let nextLandingId = 1;


/* ----------- */
/* DOM HANDLES */
/* ----------- */

const landingList = document.getElementById("landing-list");
const statusMessage = document.getElementById("status-message");
const resultDistance = document.getElementById("result-distance");
const resultVolume = document.getElementById("result-volume");
const resultShares = document.getElementById("result-shares");
const addLandingButton = document.getElementById("add-landing");
const resetButton = document.getElementById("reset-calculator");


/* ------------- */
/* INPUT PARSING */
/* ------------- */

// Normalize first, then validate. Accepts the Finnish decimal comma, which is
// why the inputs are text fields instead of number fields.
function parseNumber(value) {
  const normalized = value.trim().replace(",", ".");

  if (normalized === "") {
    return NaN;
  }

  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    return NaN;
  }

  return number;
}

// Turn the raw rows into entries the calculation can use. A row that is still
// empty is simply skipped, a row that holds something unusable is reported.
function collectEntries() {
  const entries = [];
  let hasInvalidInput = false;

  for (let index = 0; index < landings.length; index++) {
    const landing = landings[index];
    const rawVolume = landing.volume.trim();
    const rawDistance = landing.distance.trim();

    // Row not filled in yet, nothing to complain about
    if (rawVolume === "" && rawDistance === "") {
      continue;
    }

    const volume = parseNumber(rawVolume);
    const distance = parseNumber(rawDistance);

    if (Number.isNaN(volume) || Number.isNaN(distance)) {
      // Half-filled rows are just unfinished, not wrong
      if (rawVolume !== "" && rawDistance !== "") {
        hasInvalidInput = true;
      }
      continue;
    }

    // A landing with no wood does not belong in the average at all
    if (volume === 0) {
      continue;
    }

    entries.push({
      number: index + 1,
      volume: volume,
      distance: distance
    });
  }

  return { entries: entries, hasInvalidInput: hasInvalidInput };
}


/* ----------- */
/* CALCULATION */
/* ----------- */

// Pure calculation, no DOM access. Returns full precision, rounding is done
// when the result is rendered.
function calculateAverageDistance(entries) {
  let totalVolume = 0;
  let weightedSum = 0;

  for (const entry of entries) {
    totalVolume += entry.volume;
    weightedSum += entry.volume * entry.distance;
  }

  // Nothing to divide by, so there is no average to report
  if (totalVolume === 0) {
    return { totalVolume: 0, weightedDistance: null, shares: [] };
  }

  const shares = [];
  for (const entry of entries) {
    shares.push({
      number: entry.number,
      distance: entry.distance,
      share: (entry.volume / totalVolume) * 100
    });
  }

  return {
    totalVolume: totalVolume,
    weightedDistance: weightedSum / totalVolume,
    shares: shares
  };
}


/* --------- */
/* RENDERING */
/* --------- */

// Keep a stray quote in an input from breaking the attribute it is written into
function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Finnish number formatting, so the output reads the same way it is typed
function formatNumber(number, decimals) {
  return number.toLocaleString("fi-FI", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Rebuilds the rows. Only called when a row is added, removed or reset, never
// while typing, so the field being edited does not lose focus.
function renderLandings() {
  const removeDisabled = landings.length <= MIN_LANDING_COUNT;
  let markup = "";

  for (let index = 0; index < landings.length; index++) {
    const landing = landings[index];
    const number = index + 1;

    markup += `
      <div class="landing-row">
        <span class="landing-label">Varastopaikka ${number}</span>
        <div class="landing-field">
          <label for="volume-${landing.id}">Puumäärä (m&sup3;)</label>
          <input type="text" inputmode="decimal" id="volume-${landing.id}"
                 data-id="${landing.id}" data-field="volume"
                 value="${escapeAttribute(landing.volume)}" placeholder="esim. 340">
        </div>
        <div class="landing-field">
          <label for="distance-${landing.id}">Ajomatka (m)</label>
          <input type="text" inputmode="decimal" id="distance-${landing.id}"
                 data-id="${landing.id}" data-field="distance"
                 value="${escapeAttribute(landing.distance)}" placeholder="esim. 210">
        </div>
        <button type="button" class="landing-remove" data-id="${landing.id}"
                aria-label="Poista varastopaikka ${number}" ${removeDisabled ? "disabled" : ""}>
          <i data-feather="x"></i>
        </button>
      </div>`;
  }

  landingList.innerHTML = markup;

  // Without this the icons in the rows added after page load stay empty
  feather.replace();
}

function renderResult(result) {
  if (result.weightedDistance === null) {
    resultDistance.textContent = "–";
    resultVolume.textContent = "–";
    resultShares.innerHTML = "";
    return;
  }

  // The map measurement is never more accurate than this, so whole metres out
  resultDistance.textContent = formatNumber(Math.round(result.weightedDistance), 0);
  resultVolume.textContent = formatNumber(result.totalVolume, 1);

  let markup = "";
  for (const share of result.shares) {
    markup += `
      <p class="share-row">
        <span class="share-name">Varastopaikka ${share.number}</span>
        <span class="share-distance">${formatNumber(Math.round(share.distance), 0)} m</span>
        <span class="share-value">${formatNumber(share.share, 1)} %</span>
      </p>`;
  }

  resultShares.innerHTML = markup;
}

function renderStatus(message) {
  statusMessage.textContent = message;
}

// Read the rows, calculate, show the outcome
function updateResult() {
  const collected = collectEntries();

  // A wrong weighted mean looks exactly like a right one, so nothing is shown
  // until every filled row is usable
  if (collected.hasInvalidInput) {
    renderResult({ totalVolume: 0, weightedDistance: null, shares: [] });
    renderStatus(INVALID_INPUT_MESSAGE);
    return;
  }

  renderResult(calculateAverageDistance(collected.entries));
  renderStatus("");
}


/* ------------ */
/* ROW HANDLING */
/* ------------ */

function createLanding() {
  const landing = { id: nextLandingId, volume: "", distance: "" };
  nextLandingId++;
  return landing;
}

function findLanding(id) {
  for (const landing of landings) {
    if (landing.id === id) {
      return landing;
    }
  }

  return null;
}

function addLanding() {
  landings.push(createLanding());
  renderLandings();
  updateResult();
}

function removeLanding(id) {
  if (landings.length <= MIN_LANDING_COUNT) {
    return;
  }

  landings = landings.filter(landing => landing.id !== id);
  renderLandings();
  updateResult();
}

// Stale rows from the previous lohko are the easy way to get a wrong number
function resetCalculator() {
  landings = [];
  for (let count = 0; count < START_LANDING_COUNT; count++) {
    landings.push(createLanding());
  }

  renderLandings();
  updateResult();
}


/* --------- */
/* LISTENERS */
/* --------- */

function handleListInput(event) {
  const input = event.target;

  if (!input.dataset.field) {
    return;
  }

  const landing = findLanding(Number(input.dataset.id));

  if (landing === null) {
    return;
  }

  landing[input.dataset.field] = input.value;
  updateResult();
}

function handleListClick(event) {
  const button = event.target.closest(".landing-remove");

  if (button === null) {
    return;
  }

  removeLanding(Number(button.dataset.id));
}


/* ----- */
/* START */
/* ----- */

function init() {
  landingList.addEventListener("input", handleListInput);
  landingList.addEventListener("click", handleListClick);
  addLandingButton.addEventListener("click", addLanding);
  resetButton.addEventListener("click", resetCalculator);

  resetCalculator();
}

init();
