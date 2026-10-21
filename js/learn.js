// Learn page: fills the measuring guide, size chart, techniques, fabric table and glossary
// from the same data the studio uses, so the two never disagree.

import { SIZES } from './core/constants.js';
import { $, cap } from './core/dom.js';
import { BODY_FIGURE, MEASURE_TIPS } from './sizing/measure.js';
import { FIGURES } from './sewing/instructions.js';
import { FABRICS, BEGINNER_FABRIC_TIP } from './sewing/fabric.js';
import { GLOSSARY, glossify, initGlossaryPopup } from './sewing/glossary.js';
import { initSite } from './site.js';

const TECHNIQUES = {
  rst: 'Most seams start with two pieces laid face to face, so the good sides are hidden while you sew and show once the seam is turned out. Pin across the edge every 8–10 cm.',
  seam: 'Line the fabric edge up with the 1.5 cm mark on your machine’s plate and keep it there as you sew. Sew a few stitches backwards at each end to lock the seam.',
  press: 'Iron each seam flat as sewn, then open the two allowances and press them apart. Pressing as you go makes the finished garment look professional.',
  clip: 'Curved seams like necklines pull when turned out. Snip into the allowance every 1–2 cm, close to the stitching but never through it, so the curve lies flat.',
  hem: 'Fold the raw edge 0.5 cm to the wrong side and press, fold again by 1 cm, then stitch close to the inner fold. The raw edge is hidden and can’t fray.',
};

function render() {
  $('body-figure').innerHTML = BODY_FIGURE;
  $('measure-tips').innerHTML = MEASURE_TIPS.map((t) => `<li>${t}</li>`).join('');

  $('size-table').innerHTML = '<thead><tr><th>Size</th><th class="num">Bust</th><th class="num">Waist</th><th class="num">Hip</th><th class="num">Height</th></tr></thead><tbody>'
    + Object.entries(SIZES).map(([s, m]) => `<tr><td><strong>${s}</strong></td><td class="num">${m.B}</td><td class="num">${m.W}</td><td class="num">${m.H}</td><td class="num">${m.ht}</td></tr>`).join('')
    + '</tbody>';

  $('techniques-list').innerHTML = Object.entries(TECHNIQUES).map(([key, text]) => `
    <article class="technique">
      <svg class="diagram" viewBox="0 0 120 62" font-family="Arial,sans-serif" role="img" aria-label="${FIGURES[key].title}">${FIGURES[key].svg}</svg>
      <div><h3>${FIGURES[key].title}</h3><p>${text}</p></div>
    </article>`).join('');

  $('fabric-tip').textContent = BEGINNER_FABRIC_TIP;
  $('fabric-table').innerHTML = '<thead><tr><th>Garment</th><th>Easiest to sew</th><th>Once you’re confident</th></tr></thead><tbody>'
    + Object.entries(FABRICS).map(([t, [easy, next]]) => `<tr><td><strong>${cap(t)}</strong></td><td>${easy}</td><td>${next}</td></tr>`).join('')
    + '</tbody>';

  $('glossary-list').innerHTML = Object.keys(GLOSSARY).sort().map((k) =>
    `<div class="glossary__entry" id="term-${k.replace(/\s+/g, '-')}"><dt>${cap(k)}</dt><dd>${GLOSSARY[k]}</dd></div>`).join('');
}

initSite();
initGlossaryPopup();
render();
['measure-tips', 'techniques-list', 'fabric-tip'].forEach((id) => glossify($(id)));
glossify(document.querySelector('#printing'));
