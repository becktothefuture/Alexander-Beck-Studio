import { configureSimulationPalette } from '../../../palette/simulationPaletteController.js';

function normalizeLabel(value) {
  return String(value || '').trim().toLowerCase();
}

function clampInt(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const integer = Math.floor(numeric);
  return integer < min ? min : integer > max ? max : integer;
}

function buildPaletteOptions(usedByIndex) {
  const options = [];
  for (let index = 0; index < 8; index++) {
    const labelSuffix = usedByIndex[index] ? ` — ${usedByIndex[index]}` : '';
    options.push({ value: String(index), label: `Ball ${index + 1}${labelSuffix}` });
  }
  return options;
}

function sanitizeDistribution(source, globals, labels) {
  const base = Array.isArray(globals.colorDistribution) ? globals.colorDistribution : [];
  const rowsByLabel = new Map();
  for (const row of base) rowsByLabel.set(normalizeLabel(row?.label), row);

  const legacyLabelFor = new Map([
    ['art & visual direction', 'frontend craft'],
    ['product & interaction systems', 'product systems'],
    ['ai product design', 'applied ai'],
    ['creative engineering', 'prototyping'],
  ]);
  const raw = Array.isArray(source) ? source : base;
  const distribution = [];
  const used = new Set();

  for (let index = 0; index < labels.length; index++) {
    const label = String(labels[index] || '').trim();
    const key = normalizeLabel(label);
    const legacyKey = legacyLabelFor.get(key);
    const incoming = raw.find((row) => normalizeLabel(row?.label) === key)
      || (legacyKey ? raw.find((row) => normalizeLabel(row?.label) === legacyKey) : null)
      || rowsByLabel.get(key)
      || (legacyKey ? rowsByLabel.get(legacyKey) : null)
      || { label };
    let colorIndex = clampInt(
      incoming?.colorIndex,
      0,
      7,
      clampInt(rowsByLabel.get(key)?.colorIndex, 0, 7, 0),
    );
    if (used.has(colorIndex)) {
      for (let candidate = 0; candidate < 8; candidate++) {
        if (!used.has(candidate)) {
          colorIndex = candidate;
          break;
        }
      }
    }
    used.add(colorIndex);
    distribution.push({
      roleId: String(incoming?.roleId || rowsByLabel.get(key)?.roleId || '').trim(),
      label,
      colorIndex,
      weight: clampInt(
        incoming?.weight,
        0,
        100,
        clampInt(rowsByLabel.get(key)?.weight, 0, 100, 0),
      ),
    });
  }
  return distribution;
}

function normalizeWeightsTo100(weights, preferredIndex = 0) {
  const normalized = weights.map((weight) => clampInt(weight, 0, 100, 0));
  let sum = 0;
  for (let index = 0; index < normalized.length; index++) sum += normalized[index];
  if (sum === 100) return normalized;
  if (sum === 0) {
    normalized[preferredIndex] = 100;
    return normalized;
  }

  const scaled = new Array(normalized.length).fill(0);
  let scaledSum = 0;
  for (let index = 0; index < normalized.length; index++) {
    const value = Math.round((normalized[index] / sum) * 100);
    scaled[index] = value;
    scaledSum += value;
  }
  let drift = 100 - scaledSum;
  while (drift !== 0) {
    if (drift > 0) {
      let best = 0;
      for (let index = 1; index < scaled.length; index++) {
        if (scaled[index] > scaled[best]) best = index;
      }
      scaled[best] += 1;
      drift -= 1;
    } else {
      let best = -1;
      for (let index = 0; index < scaled.length; index++) {
        if (scaled[index] > 0 && (best === -1 || scaled[index] > scaled[best])) best = index;
      }
      if (best === -1) break;
      scaled[best] -= 1;
      drift += 1;
    }
  }
  return scaled.map((weight) => clampInt(weight, 0, 100, 0));
}

function rebalanceWeights(distribution, changedRow, newWeight) {
  const weights = distribution.map((row) => clampInt(row?.weight, 0, 100, 0));
  weights[changedRow] = clampInt(newWeight, 0, 100, weights[changedRow]);
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return sum === 100 ? weights : normalizeWeightsTo100(weights, changedRow);
}

function getModeBallCountApprox(globals) {
  const countsByMode = {
    pit: null,
    flies: globals.fliesBallCount,
    weightless: globals.weightlessCount,
    water: globals.waterBallCount,
    magnetic: globals.magneticBallCount,
    'kaleidoscope-3': globals.kaleidoscope3BallCount,
    'kaleidoscope-rift': globals.kaleidoscopeRiftBallCount,
    critters: globals.critterCount,
    '3d-sphere': globals.sphere3dDensity,
    '3d-cube': null,
    'starfield-3d': globals.starfieldCount,
    'elastic-center': null,
    'flubber-blob': globals.flubberBlobBallCount,
    'pressure-crucible': globals.pressureCrucibleBallCount,
    'particle-fountain': globals.particleFountainMaxParticles,
    'particle-fountain-b': globals.particleFountainMaxParticles,
  };
  const count = countsByMode[globals.currentMode];
  return Number.isFinite(Number(count)) ? Number(count) : null;
}

function applyDistributionSideEffects() {
  import('./legend-colors.js')
    .then(({ applyExpertiseLegendColors }) => applyExpertiseLegendColors?.())
    .catch(() => {});
}

function commitDistribution(globals, distribution) {
  const snapshot = configureSimulationPalette({ colorDistribution: distribution });
  globals.colorDistribution = snapshot.distribution.map((row) => ({ ...row }));
  return globals.colorDistribution;
}

function syncColorDistributionUI(globals, labels, uiDocument) {
  const sanitized = sanitizeDistribution(globals.colorDistribution, globals, labels);
  const weights = normalizeWeightsTo100(sanitized.map((row) => row.weight), 0);
  for (let index = 0; index < sanitized.length; index++) sanitized[index].weight = weights[index];
  const committed = commitDistribution(globals, sanitized);

  const usedByIndex = {};
  for (let index = 0; index < committed.length; index++) {
    usedByIndex[committed[index].colorIndex] = committed[index].label;
  }
  const options = buildPaletteOptions(usedByIndex);
  const modeCount = getModeBallCountApprox(globals);

  for (let index = 0; index < labels.length; index++) {
    const row = committed[index] || { colorIndex: 0, weight: 0, label: labels[index] };
    const swatch = uiDocument.getElementById(`colorDistSwatch${index}`);
    const select = uiDocument.getElementById(`colorDistColor${index}`);
    const weight = uiDocument.getElementById(`colorDistWeight${index}`);
    const weightValue = uiDocument.getElementById(`colorDistWeightVal${index}`);
    if (select) {
      select.innerHTML = '';
      for (const option of options) {
        const optionElement = uiDocument.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        const colorIndex = clampInt(option.value, 0, 7, 0);
        const takenBy = usedByIndex[colorIndex];
        const isMine = colorIndex === row.colorIndex;
        if (takenBy && !isMine) optionElement.disabled = true;
        select.appendChild(optionElement);
      }
      select.value = String(row.colorIndex);
    }
    if (weight) weight.value = String(clampInt(row.weight, 0, 100, 0));
    if (weightValue) {
      const percent = clampInt(row.weight, 0, 100, 0);
      const approximateCount = modeCount != null ? Math.round((percent / 100) * modeCount) : null;
      weightValue.textContent = approximateCount != null
        ? `${percent}% (≈${approximateCount})`
        : `${percent}%`;
    }
    if (swatch) {
      const colorIndex = clampInt(row.colorIndex, 0, 7, 0);
      swatch.style.backgroundColor = `var(--ball-${colorIndex + 1})`;
    }
  }

  const totalElement = uiDocument.getElementById('colorDistTotalVal');
  if (totalElement) {
    let total = 0;
    for (let index = 0; index < committed.length; index++) total += committed[index].weight;
    totalElement.textContent = `${total}%`;
  }
}

export function generateColorDistributionControlHTML(control) {
  const labels = Array.isArray(control.labels) ? control.labels : [];
  const rowsHtml = labels.map((label, index) => {
    const safeLabel = String(label || '').trim();
    const swatchId = `colorDistSwatch${index}`;
    const selectId = `colorDistColor${index}`;
    const weightId = `colorDistWeight${index}`;
    const weightValId = `colorDistWeightVal${index}`;
    return `
        <div class="color-dist-row" data-color-dist-row="${index}">
          <div class="color-dist-row-label">${safeLabel}</div>
          <div class="color-dist-row-controls">
            <span class="color-dist-swatch" id="${swatchId}" aria-hidden="true"></span>
            <select id="${selectId}" class="control-select color-dist-select" aria-label="${safeLabel} color"></select>
            <input type="range" id="${weightId}" min="0" max="100" step="1" value="0" aria-label="${safeLabel} weight">
            <span class="color-dist-weight" id="${weightValId}">0%</span>
          </div>
        </div>`;
  }).join('');
  const rowClass = control.isHero ? 'control-row control-row--hero' : 'control-row';
  return `
      <div class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="colorDistTotalVal">100%</span>
        </div>
        <div class="color-dist-grid" id="colorDistGrid">
          ${rowsHtml}
        </div>
        <div class="color-dist-actions">
          <button type="button" class="secondary" id="colorDistResetBtn" aria-label="Reset color distribution to defaults">Reset Defaults</button>
        </div>
      </div>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
}

export function bindColorDistributionControl(control, globals, uiDocument) {
  const labels = Array.isArray(control.labels) ? control.labels : [];
  const resetButton = uiDocument.getElementById('colorDistResetBtn');

  try {
    syncColorDistributionUI(globals, labels, uiDocument);
  } catch {
    // Keep panel mounting resilient when a document host is incomplete.
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      const defaults = globals?.config?.colorDistribution;
      const distribution = sanitizeDistribution(defaults, globals, labels);
      const weights = normalizeWeightsTo100(distribution.map((row) => row.weight), 0);
      for (let index = 0; index < distribution.length; index++) distribution[index].weight = weights[index];
      commitDistribution(globals, distribution);
      syncColorDistributionUI(globals, labels, uiDocument);
      applyDistributionSideEffects();
    });
  }

  for (let index = 0; index < labels.length; index++) {
    const select = uiDocument.getElementById(`colorDistColor${index}`);
    const weight = uiDocument.getElementById(`colorDistWeight${index}`);
    if (select) {
      select.addEventListener('change', () => {
        const colorIndex = clampInt(select.value, 0, 7, 0);
        const distribution = sanitizeDistribution(globals.colorDistribution, globals, labels);
        distribution[index].colorIndex = colorIndex;
        commitDistribution(globals, distribution);
        syncColorDistributionUI(globals, labels, uiDocument);
        applyDistributionSideEffects();
      });
    }
    if (weight) {
      weight.addEventListener('input', () => {
        const value = clampInt(weight.value, 0, 100, 0);
        const distribution = sanitizeDistribution(globals.colorDistribution, globals, labels);
        const weights = rebalanceWeights(distribution, index, value);
        for (let row = 0; row < distribution.length; row++) distribution[row].weight = weights[row];
        commitDistribution(globals, distribution);
        syncColorDistributionUI(globals, labels, uiDocument);
        applyDistributionSideEffects();
      });
    }
  }
}
