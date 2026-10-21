// Pattern studio: photo → garments → pattern, instructions, fabric plan and print pages.

import { PAPERS, SIZES, EASE, LENGTHS, GARMENTS, SLEEVES, NECKLINES, CLOSURES, SHEET_MARGIN as MG, isBodice, isLegs } from './core/constants.js';
import { $, esc } from './core/dom.js';
import { state, newItem, itemLabel, activeIndexes, optionKey } from './core/state.js';
import { makePieces } from './pattern/geometry.js';
import { layoutPattern, previewSvg, patternPages, pageSvg, sheetMap, Pager } from './pattern/sheets.js';
import { standardSteps, figureOf } from './sewing/instructions.js';
import { fabricPlan, planSvg } from './sewing/fabric.js';
import { glossify, initGlossaryPopup } from './sewing/glossary.js';
import { BODY_FIGURE, MEASURE_TIPS, recommendSize } from './sizing/measure.js';
import { getClaude, identifyGarments, writeInstructions, explain } from './ai/claude.js';
import { CropTool, maskOf, applyShape, guessGarment } from './photo/outline.js';
import { garmentSketch } from './sewing/diagrams.js';
import { buildPdf, savePdf } from './export/pdf.js';
import { initSite } from './site.js';

const inClaude = Boolean(window.claude);
/** Every printable page of the current pattern: { svg, label }. */
let pages = [];

const ASSEMBLY = [
  '1. Measure the 5 × 5 cm square on the pattern. If it is not 5 cm, reprint at 100% / Actual size.',
  '2. On every sheet cut off the LEFT and TOP margins along the solid scissor line. Keep the shaded tabs on the right and bottom.',
  '3. Start at the top-left sheet. Lay the next sheet’s trimmed edge over the shaded tab, match the pattern lines, and tape.',
  '4. Join each row, then join the rows. Use the map below and the labels (1A, 1B…).',
  '5. Cut along the solid outer line, sew on the dashed line (1.5 cm seam allowance). Follow the fold and grainline marks.',
];

// ---------------------------------------------------------------- status line

function setStatus(text, kind = '') {
  const el = $('status');
  el.textContent = text;
  el.className = 'status' + (kind ? ` notice notice--${kind}` : '');
}

// ---------------------------------------------------------------- garment cards

const selectField = (key, options, value, label) =>
  `<label class="field"><span>${label}</span><select data-key="${key}">${options.map((o) => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
const rangeField = (key, value, label, min, max) =>
  `<label class="field"><span>${label}</span><input type="range" data-key="${key}" min="${min}" max="${max}" value="${value}"></label>`;
const MEASURE_NAMES = { B: 'Bust', W: 'Waist', H: 'Hip', ht: 'Height' };

function renderItems() {
  const { items } = state;
  $('items').innerHTML = items.length ? items.map((it, i) => {
    const t = it.type;
    const bodice = isBodice(t);
    const legs = isLegs(t);
    const custom = it.size === 'Custom'
      ? `<div class="fields">${Object.keys(MEASURE_NAMES).map((k) => `<label class="field"><span>${MEASURE_NAMES[k]} (cm)</span><input type="number" inputmode="decimal" data-custom data-key="${k}" value="${it.custom[k]}"></label>`).join('')}</div>`
      : '';
    return `<article class="item" data-index="${i}">
      <div class="item__head"><h3>${itemLabel(i)}</h3><button class="btn btn--ghost btn--small" type="button" data-remove>Remove</button></div>
      ${it.example ? '<p class="item__example">Example garment</p>' : ''}
      <p class="item__desc">${esc(it.desc || `${t} · ${it.length}`)}</p>
      ${it.needsCheck ? '<p class="notice notice--warn small">This is a guess from the photo’s outline. Check the garment, sleeves, neckline and length below.</p>' : ''}
      ${selectField('size', [...Object.keys(SIZES), 'Custom'], it.size, 'Size')}
      ${custom}
      <details${it.needsCheck ? ' open' : ''}><summary>Change the style</summary><div class="fields">
        ${selectField('type', GARMENTS, t, 'Garment')}${selectField('length', Object.keys(LENGTHS[t]), it.length, 'Length')}
        ${selectField('fit', Object.keys(EASE), it.fit, 'Fit')}${bodice ? selectField('sleeves', SLEEVES, it.sleeves, 'Sleeves') : selectField('close', CLOSURES, it.close, 'Waist closure')}
        ${bodice ? selectField('neck', NECKLINES, it.neck, 'Neckline') : ''}
        ${t === 'top' ? '' : rangeField('flare', it.flare, legs ? 'Leg width' : 'Skirt flare', legs ? 50 : 100, legs ? 150 : 210)}
        ${bodice ? rangeField('waist', it.waist, 'Waist shaping', 0, 100) : ''}
      </div></details>
    </article>`;
  }).join('') : '<p class="muted small">Scan a photo or add a garment by hand to begin.</p>';

  if (state.scope !== 'all' && !items[Number(state.scope)]) state.scope = 'all';
  $('scope-card').hidden = items.length < 2;
  $('scope').innerHTML = `<button class="chip" type="button" data-scope="all" aria-pressed="${state.scope === 'all'}">All ${items.length} garments</button>`
    + items.map((_, i) => `<button class="chip" type="button" data-scope="${i}" aria-pressed="${state.scope === String(i)}">${itemLabel(i)} only</button>`).join('');
}

// ---------------------------------------------------------------- pictures

/** Print width (mm) for a picture: at most maxW wide and maxH tall. */
const printWidth = (f, maxW, maxH) => Math.min(maxW, (maxH * f.vw) / f.vh);

/** A step diagram sized so tall pieces don't fill the screen. */
const diagramHtml = (f, label) =>
  `<svg class="diagram" style="width:${Math.round(Math.min(300, (320 * f.vw) / f.vh))}px" viewBox="0 0 ${f.vw} ${f.vh}" font-family="Arial,sans-serif" role="img" aria-label="${esc(label)}">${f.svg}</svg>`;

/** Your photo beside a sketch of the finished garment, for the studio. */
function garmentView(it, pieces) {
  const sketch = garmentSketch(pieces, it);
  const photo = state.photoUrl && !it.example
    ? `<figure><img src="${state.photoUrl}" alt="Your photo"><figcaption>Your photo</figcaption></figure>` : '';
  return `<div class="garment-view">${photo}<figure><svg viewBox="0 0 ${sketch.vw} ${sketch.vh}" role="img" aria-label="Sketch of the finished ${it.type}">${sketch.svg}</svg><figcaption>${it.example ? 'The example, sewn' : 'Your pattern, sewn'}</figcaption></figure></div>`;
}

/** The same comparison for print: the photo and one sketch per garment, side by side. */
function garmentPanel(entries, withPhoto) {
  const H = 100, gap = 10;
  let x = 0, s = '';
  if (withPhoto && state.photoUrl) {
    s += `<image href="${state.photoUrl}" x="0" y="0" width="75" height="${H}" preserveAspectRatio="xMidYMid meet"/><text x="37.5" y="${H + 9}" font-size="6" text-anchor="middle" fill="#000">Your photo</text>`;
    x = 75 + gap;
  }
  for (const { sketch, label } of entries) {
    const w = (H * sketch.vw) / sketch.vh;
    s += `<svg x="${x}" y="0" width="${w}" height="${H}" viewBox="0 0 ${sketch.vw} ${sketch.vh}">${sketch.svg}</svg><text x="${x + w / 2}" y="${H + 9}" font-size="6" text-anchor="middle" fill="#000">${esc(label)}</text>`;
    x += w + gap;
  }
  return { svg: s, vw: x - gap, vh: H + 12 };
}

// ---------------------------------------------------------------- instructions

const usingClaude = (it) => Boolean(it.aiSteps && it.aiSteps.key === optionKey(it));

function aiPanel(it, i) {
  const ai = it.ai;
  const busy = it.aiState === 'busy';
  const error = !busy && it.aiState;
  const own = usingClaude(it);
  let photo = '';
  if (ai && (ai.summary || ai.details.length || ai.tips.length)) {
    photo = `<div class="from-photo notice"><p class="label">From your photo</p>`
      + (ai.summary ? `<p>${esc(ai.summary)}</p>` : '')
      + (ai.details.length ? `<p><strong>Details the basic pattern simplifies:</strong> ${esc(ai.details.join(', '))}.</p>` : '')
      + (ai.tips.length ? `<ul>${ai.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '')
      + '</div>';
  }
  const message = busy ? '<span class="busy">Claude is writing new instructions and diagrams for this garment. This can take a minute or two.</span>'
    : own ? 'These steps and diagrams were written by Claude for your photo.'
    : error ? `Couldn’t write new instructions: ${esc(error)} Showing the standard steps for now.`
    : it.aiSteps ? 'You changed the style, so these are the standard steps until you ask Claude again.'
    : state.aiAvailable ? 'These are the standard steps for this style.'
    : 'These are the standard steps for this style. Instructions written by Claude for your photo need the Claude version of this site.';
  const button = state.aiAvailable && !busy
    ? `<button class="btn btn--small ${own ? 'btn--ghost' : 'btn--primary'}" type="button" data-write="${i}">${own ? 'Write new instructions' : 'Write instructions with Claude'}</button>`
    : '';
  return `${photo}<div class="ai-state notice${own ? ' notice--ai' : ''}"><p>${message}</p>${button}</div>`;
}

function renderHow(active, stepsFor, perItem) {
  $('how').innerHTML = active.map((i, k) => {
    const it = state.items[i];
    const ctx = { pieces: perItem[k], item: it };
    const steps = stepsFor[k].map(([text, fig]) => {
      const f = figureOf(fig, ctx);
      return `<li><div>${esc(text)}${f ? diagramHtml(f, 'Diagram for this step') : ''}</div></li>`;
    }).join('');
    return `<section class="how-garment"><h3>${itemLabel(i)} · size ${it.size}</h3>${garmentView(it, perItem[k])}${aiPanel(it, i)}<ol class="steps">${steps}</ol></section>`;
  }).join('');
  glossify($('how'));
}

// ---------------------------------------------------------------- fabric

function renderFabric(plan) {
  const widths = plan.widths.map((w) => {
    if (w.plan.bad) return `<div class="fabric-width"><p class="notice notice--warn">${esc(plan.describe(w))}</p></div>`;
    const g = planSvg(w.plan, 'lay' + w.cm);
    return `<div class="fabric-width"><p class="fabric-width__amount">${esc(plan.describe(w))}</p><svg class="layout-svg" viewBox="0 0 ${g.vw} ${g.vh}" font-family="Arial,sans-serif" role="img" aria-label="Cutting layout on ${w.cm} cm fabric">${g.svg}</svg></div>`;
  }).join('');
  $('fabric').innerHTML = `<div class="fabric-intro"><h3>Fabric to buy</h3><p class="muted small">For fabric folded in half lengthwise, with every grainline parallel to the selvedge. Includes about 10% extra, rounded up to the next 10 cm.</p></div>${widths}`
    + `<div class="fabric-cols"><div><h3>Supplies</h3><ul class="tick-list">${plan.supplies.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`
    + `<div><h3>Good fabrics</h3><ul class="tick-list">${plan.fabrics.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div></div>`;
  glossify($('fabric'));
}

// ---------------------------------------------------------------- print pages

function startPages(grid, title, pieces, plan, paper, active, perItem) {
  const { cols, rows, needed, count } = grid;
  const [PW, PH] = paper;
  const pg = new Pager(paper, 'Start here');
  const fs = pg.fs;
  pg.text(`${title} · ${$('paper').value} · ${count} pattern sheets in a ${cols} × ${rows} grid (empty squares need no printing)`, true);
  pg.gap();
  const panel = garmentPanel(active.map((i, k) => ({ sketch: garmentSketch(perItem[k], state.items[i]), label: itemLabel(i) + ', sewn' })),
    active.some((i) => !state.items[i].example));
  pg.text('Your garment', true, 1.3);
  pg.figure(panel.svg, panel.vw, panel.vh, printWidth(panel, PW - 2 * MG - 16, 60));
  ASSEMBLY.forEach((t) => pg.text(t));
  pg.gap();
  pg.text('Pieces', true);
  pieces.forEach((c) => pg.text('• ' + c.n + ' — ' + c.note));
  if ((PH - pg.y - MG - 8) / rows < 2) pg.newPage();
  const cell = Math.max(2, Math.min(10, (PW - 2 * MG - 12) / cols, (PH - pg.y - MG - 8) / rows));
  pg.raw(`<g transform="translate(${MG + 6} ${pg.y + fs})">${sheetMap(cols, rows, needed, cell, null, true)}</g>`, fs * 3.5 + cell * rows);

  const figs = plan.widths.map((w) => {
    if (w.plan.bad) return null;
    const g = planSvg(w.plan, 'p' + w.cm);
    g.w = Math.min(PW - 2 * MG - 16, (70 * g.vw) / g.vh);
    g.h = (g.w * g.vh) / g.vw;
    return g;
  });
  pg.room(fs * 9 + (figs[0] ? figs[0].h : 0));
  pg.text('Fabric to buy', true, 1.3);
  pg.text('For fabric folded in half lengthwise. Includes about 10% extra, rounded up to the next 10 cm.');
  plan.widths.forEach((w, j) => {
    const g = figs[j];
    if (!g) return pg.text(plan.describe(w), true);
    pg.room(fs * 2 + g.h);
    pg.text(plan.describe(w), true);
    pg.figure(g.svg, g.vw, g.vh, g.w);
  });
  pg.gap(0.5); pg.room(fs * 6); pg.text('Supplies', true, 1.3); plan.supplies.forEach((s) => pg.text('• ' + s));
  pg.gap(0.5); pg.room(fs * 6); pg.text('Good fabrics', true, 1.3); plan.fabrics.forEach((s) => pg.text('• ' + s));
  return pg.finish().map((s, j) => ({ svg: pageSvg(s, paper), label: j ? `Start here ${j + 1}` : 'Start here' }));
}

function howPages(active, stepsFor, paper, perItem) {
  const pg = new Pager(paper, 'How to sew it');
  const maxW = paper[0] - 2 * MG - 16;
  active.forEach((i, k) => {
    const it = state.items[i];
    const ai = it.ai;
    const ctx = { pieces: perItem[k], item: it };
    pg.room(pg.fs * 10);
    pg.text(`${itemLabel(i)} · size ${it.size}`, true, 1.3);
    const panel = garmentPanel([{ sketch: garmentSketch(perItem[k], it), label: 'Finished ' + it.type }], !it.example);
    pg.figure(panel.svg, panel.vw, panel.vh, printWidth(panel, maxW, 45));
    if (ai?.summary) pg.text('From your photo: ' + ai.summary);
    if (ai?.details.length) pg.text('Details the basic pattern simplifies: ' + ai.details.join(', ') + '.');
    ai?.tips.forEach((t) => pg.text('• ' + t));
    if (usingClaude(it)) pg.text('Steps and diagrams written by Claude for your photo.', true);
    pg.gap(0.4);
    stepsFor[k].forEach(([text, fig], j) => {
      pg.text(`${j + 1}. ${text}`);
      const f = figureOf(fig, ctx);
      if (f) pg.figure(f.svg, f.vw, f.vh, printWidth(f, Math.min(maxW, paper[0] * 0.55), 70));
      pg.gap(0.4);
    });
    pg.gap();
  });
  return pg.finish().map((s, j) => ({ svg: pageSvg(s, paper), label: `How to sew ${j + 1}` }));
}

// ---------------------------------------------------------------- render everything

function render() {
  const { items } = state;
  if (!items.length) {
    $('preview').innerHTML = '<p class="muted small" style="padding:1rem">Scan a photo or add a garment to see your pattern.</p>';
    $('how').innerHTML = '<p class="muted">Step-by-step instructions for your pattern appear here.</p>';
    $('fabric').innerHTML = '<p class="muted">How much fabric to buy, a cutting layout and a supplies list appear here.</p>';
    $('sheets').innerHTML = '';
    $('pattern-info').textContent = '';
    pages = [];
    return;
  }
  const active = activeIndexes();
  const paperName = $('paper').value;
  const paper = PAPERS[paperName];
  $('page-size').textContent = `@page{size:${paper[0]}mm ${paper[1]}mm;margin:0}@media print{.sheet{width:${paper[0]}mm;height:${paper[1]}mm}}`;

  const perItem = active.map((i) => makePieces(items[i], itemLabel(i).toUpperCase()));
  const pieces = perItem.flat();
  const stepsFor = active.map((i, k) => (usingClaude(items[i]) ? items[i].aiSteps.steps : standardSteps(items[i], perItem[k].info)));
  renderHow(active, stepsFor, perItem);

  const grid = layoutPattern(pieces, paper);
  const title = 'Pattern: ' + active.map((i) => `${itemLabel(i)} ${items[i].size}`).join(' + ');
  $('preview').innerHTML = previewSvg(grid, title, $('show-sheets').checked);

  const plan = fabricPlan(active, perItem, pieces);
  renderFabric(plan);

  pages = [...startPages(grid, title, pieces, plan, paper, active, perItem), ...patternPages(grid, title), ...howPages(active, stepsFor, paper, perItem)];
  $('sheets').innerHTML = pages.map((p) => `<div class="sheet"><span class="sheet__label">${p.label}</span>${p.svg}</div>`).join('');
  $('pattern-info').textContent = `${Math.round(grid.layout.W / 10)} × ${Math.round(grid.layout.H / 10)} cm · ${grid.count} pattern sheets + ${pages.length - grid.count} instruction pages on ${paperName}`;
  $('download-btn').textContent = `Download PDF (${pages.length} pages)`;
}

// ---------------------------------------------------------------- photo scan

const crop = new CropTool($('crop-canvas'), () => { $('crop-area').hidden = false; });

function setScanning(on) {
  $('scan-btn').disabled = on;
  $('scan-whole-btn').disabled = on;
}

async function scan(whole) {
  if (!crop.image) return;
  const canvas = crop.cropped(whole);
  const mask = maskOf(canvas);
  let found = [];
  let problem = '';
  // A small copy of the photo, shown beside the pattern and printed on the PDF.
  const thumb = document.createElement('canvas');
  const k = Math.min(1, 420 / Math.max(canvas.width, canvas.height));
  thumb.width = Math.round(canvas.width * k);
  thumb.height = Math.round(canvas.height * k);
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  state.photoUrl = thumb.toDataURL('image/jpeg', 0.82);
  setScanning(true);
  setStatus(state.aiQuality === 'best'
    ? 'Claude is looking at your photo. With Best detail this can take a minute or two…'
    : 'Claude is looking at your photo…');

  const claude = await getClaude();
  state.aiAvailable = Boolean(claude);
  if (!claude) {
    problem = 'AI is off on this version of the site, so I worked from the outline of your photo.';
  } else {
    try {
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      state.photo = blob;
      found = await identifyGarments(claude, blob, mask);
      if (!found.length) problem = 'Claude couldn’t find a garment it can pattern in this photo, so I worked from its outline.';
    } catch (e) {
      problem = `The AI scan didn’t work: ${explain(e)} I worked from the outline of your photo instead.`;
    }
  }
  if (!found.length) {
    const type = guessGarment(mask);
    const it = newItem(type);
    it.desc = `${type} · guessed from the outline of your photo`;
    it.needsCheck = true;
    applyShape(it, mask, [0, 0, 1, 1], 0.42, 0.6);
    found = [it];
    problem += ` It looks like ${type === 'pants' || type === 'shorts' ? '' : 'a '}${type}. Check the garment, sleeves and neckline under “Change the style” so the pattern and steps match.`;
  }
  state.items = found;
  state.scope = 'all';
  renderItems();
  render();
  setScanning(false);

  const names = found.map((it, i) => itemLabel(i) + (it.ai?.summary ? ` (${it.ai.summary})` : '')).join(' + ');
  if (problem) {
    setStatus(`${problem} Found: ${names}.`, 'warn');
  } else {
    setStatus(`Found: ${names}. Pick your size${found.length > 1 ? ' for each' : ''}. Claude is now writing your instructions.`, 'ai');
    found.forEach((it) => writeInstructions(it, render));
  }
}

// ---------------------------------------------------------------- tabs

function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const choose = (tab) => tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).classList.toggle('is-active', on);
  });
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      choose(next);
      next.focus();
    });
  });
}

// ---------------------------------------------------------------- measuring and size finder

function initMeasure() {
  $('body-figure').innerHTML = BODY_FIGURE;
  $('measure-tips').innerHTML = MEASURE_TIPS.map((t) => `<li>${t}</li>`).join('');
  glossify($('measure-tips'));
  const dialog = $('measure-dialog');
  let last = null;

  const open = (toFinder) => {
    ['B', 'W', 'H', 'ht'].forEach((k) => { $('m-' + k).value = state.pref.custom[k]; });
    dialog.showModal();
    if (toFinder) { $('finder-title').scrollIntoView(); $('m-B').focus(); }
  };
  $('measure-btn').addEventListener('click', () => open(false));
  $('finder-btn').addEventListener('click', () => open(true));
  $('measure-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  $('finder').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = {};
    ['B', 'W', 'H', 'ht'].forEach((k) => { m[k] = Number($('m-' + k).value); });
    const out = $('finder-result');
    if (['B', 'W', 'H'].some((k) => !(m[k] > 40 && m[k] < 200))) {
      out.innerHTML = '<p class="notice notice--warn">Please enter your bust, waist and hip in centimetres.</p>';
      return;
    }
    if (!(m.ht > 100 && m.ht < 230)) m.ht = state.pref.custom.ht;
    const r = recommendSize(m);
    last = { m, r };
    out.innerHTML = r.same && !r.outside
      ? `<div class="notice notice--ai finder-result"><p><strong>Your size is ${r.bust}.</strong> Your bust, waist and hip all match it.</p><div class="chips"><button class="btn btn--primary btn--small" type="button" data-apply="size">Use size ${r.bust}</button></div></div>`
      : `<div class="notice finder-result"><p>${r.outside ? 'Some of your measurements are outside the XS–XL chart. ' : ''}Your bust is closest to <strong>${r.bust}</strong>, your waist to <strong>${r.waist}</strong> and your hip to <strong>${r.hip}</strong>.${r.same ? '' : ' That’s very common: few bodies match one size exactly.'}</p>`
        + '<p>Instead of one size, use your own measurements. The pattern then follows your bust, waist and hip and blends smoothly between them (this is called grading between sizes), and lengths follow your height.</p>'
        + `<div class="chips"><button class="btn btn--primary btn--small" type="button" data-apply="custom">Use my measurements</button>${!r.outside && r.bust !== r.hip ? `<button class="btn btn--ghost btn--small" type="button" data-apply="split">${r.bust} for tops &amp; dresses, ${r.hip} for bottoms</button>` : ''}</div></div>`;
  });

  $('finder-result').addEventListener('click', (e) => {
    const how = e.target.closest('[data-apply]')?.dataset.apply;
    if (!how || !last) return;
    const { m, r } = last;
    const custom = { B: m.B, W: m.W, H: m.H, ht: m.ht };
    state.pref = how === 'custom' ? { size: 'Custom', bottom: '', custom } : { size: r.bust, bottom: how === 'split' ? r.hip : '', custom };
    state.items.forEach((it) => {
      it.custom = { ...custom };
      it.size = state.pref.size === 'Custom' || isBodice(it.type) ? state.pref.size : state.pref.bottom || state.pref.size;
    });
    renderItems();
    render();
    dialog.close();
    setStatus(state.items.length ? 'Your size is applied. You can still change it for each garment.' : 'Your size is saved and will be used when you scan a photo.');
  });
}

// ---------------------------------------------------------------- AI quality

function initQuality() {
  try { if (localStorage.getItem('aiQuality') === 'fast') state.aiQuality = 'fast'; } catch { /* storage unavailable */ }
  const chips = document.querySelectorAll('[data-quality]');
  const show = () => chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.quality === state.aiQuality)));
  chips.forEach((c) => c.addEventListener('click', () => {
    state.aiQuality = c.dataset.quality;
    try { localStorage.setItem('aiQuality', state.aiQuality); } catch { /* storage unavailable */ }
    show();
  }));
  show();
}

// ---------------------------------------------------------------- events

function bindEvents() {
  $('photo-input').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) crop.load(f); });
  $('scan-btn').addEventListener('click', () => scan(false));
  $('scan-whole-btn').addEventListener('click', () => scan(true));

  $('items').addEventListener('input', (e) => {
    const el = e.target;
    const key = el.dataset.key;
    if (!key) return;
    const i = Number(el.closest('[data-index]').dataset.index);
    const it = state.items[i];
    const value = el.type === 'range' || el.type === 'number' ? Number(el.value) : el.value;
    if ('custom' in el.dataset) it.custom[key] = value;
    else if (key === 'type') state.items[i] = Object.assign(newItem(value), { custom: it.custom, size: it.size, needsCheck: it.needsCheck });
    else { it[key] = value; if (key !== 'size') it.desc = ''; }
    if (key === 'type' || key === 'size') renderItems();
    render();
  });
  $('items').addEventListener('click', (e) => {
    if (!e.target.closest('[data-remove]')) return;
    state.items.splice(Number(e.target.closest('[data-index]').dataset.index), 1);
    state.scope = 'all';
    renderItems();
    render();
  });
  $('scope').addEventListener('click', (e) => {
    const b = e.target.closest('[data-scope]');
    if (!b) return;
    state.scope = b.dataset.scope;
    renderItems();
    render();
  });
  $('add-btn').addEventListener('click', () => {
    state.items.push(newItem($('add-type').value));
    renderItems();
    render();
  });
  $('how').addEventListener('click', (e) => {
    const b = e.target.closest('[data-write]');
    const it = b && state.items[Number(b.dataset.write)];
    if (it) writeInstructions(it, render);
  });
  $('paper').addEventListener('change', render);
  $('show-sheets').addEventListener('change', render);
  $('print-btn').addEventListener('click', () => window.print());

  $('download-btn').addEventListener('click', async () => {
    if (!pages.length) return;
    const btn = $('download-btn');
    const label = btn.textContent;
    const paperName = $('paper').value;
    btn.disabled = true;
    try {
      const pdf = await buildPdf(pages.map((p) => p.svg), PAPERS[paperName], (n, total) => { btn.textContent = `Building page ${n} of ${total}…`; });
      await savePdf(pdf, `sewing-pattern-${paperName}.pdf`);
      $('download-status').textContent = 'Your PDF is ready. Print it at 100% / Actual size.';
    } catch (e) {
      $('download-status').textContent = `Couldn’t save the PDF (${e?.code || e?.message || 'error'}). ${inClaude ? 'Try again in a moment.' : 'Use Print, then choose Save as PDF.'}`;
    }
    btn.disabled = false;
    btn.textContent = label;
  });
}

// ---------------------------------------------------------------- start

function start() {
  initSite();
  initGlossaryPopup();
  glossify($('legend'));
  $('paper').innerHTML = Object.keys(PAPERS).map((k) => `<option>${k}</option>`).join('');
  // Inside Claude the browser can't open its print dialog, so only the PDF is offered.
  $('print-btn').hidden = inClaude;
  initTabs();
  initMeasure();
  initQuality();
  bindEvents();

  // Open on a worked example so the studio shows what it makes.
  const example = newItem('dress');
  Object.assign(example, { sleeves: 'short', example: true, desc: 'A knee-length dress with short sleeves in size M. Upload a photo to pattern your own garment.' });
  state.items = [example];
  renderItems();
  render();

  getClaude().then((claude) => {
    if (!claude) return;
    state.aiAvailable = true;
    $('ai-note').insertAdjacentHTML('afterend', '<p class="notice notice--ai small">Claude is connected. Your photo will be recognised and your instructions written for it.</p>');
    render();
  });
}

start();
