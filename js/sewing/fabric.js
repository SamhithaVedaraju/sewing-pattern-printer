// Fabric calculator: lays the real pattern pieces on folded fabric,
// works out how much to buy, and lists supplies.

import { SEAM, isBodice } from '../core/constants.js';
import { state, itemLabel, measurementsOf } from '../core/state.js';
import { cap } from '../core/dom.js';

/**
 * Pack pieces on fabric folded lengthwise.
 * x runs across from the fold (mm), y runs down the length; the grain stays along y.
 * @param rotateBand lay waistbands along the selvedge instead of folding them in half
 */
function pack(pieces, fabricCm, rotateBand) {
  const width = (fabricCm / 2 - 1) * 10;
  const gap = 10;
  const rects = [];
  const placed = [];

  for (const c of pieces) {
    const along = c.cut === 'b' && (rotateBand || c.w / 2 + SEAM > width);
    const halfBand = c.cut === 'b' && !along;
    const onFold = c.fold || halfBand;
    const w = along ? c.h + 2 * SEAM : halfBand ? c.w / 2 + SEAM : c.fold ? c.w + SEAM : c.w - c.x0 + 2 * SEAM;
    const h = (along ? c.w : c.h) + 2 * SEAM;
    for (let k = c.cut === 'f2' ? 2 : 1; k--;) rects.push({ c, w, h, onFold, halfBand, along });
  }
  // Fold pieces first (they must touch the fold), tallest first.
  rects.sort((a, b) => b.onFold - a.onFold || b.h - a.h);

  for (const r of rects) {
    if (r.w > width) return { bad: r.c.n };
    let best = null;
    const xs = r.onFold ? [0] : [0, ...placed.map((p) => p.x + p.w + gap)];
    const ys = [0, ...placed.map((p) => p.y + p.h + gap)];
    for (const y of ys) {
      for (const x of xs) {
        if (x + r.w > width) continue;
        if (placed.some((p) => x < p.x + p.w && x + r.w > p.x && y < p.y + p.h && y + r.h > p.y)) continue;
        if (!best || y < best.y || (y === best.y && x < best.x)) best = { x, y };
      }
    }
    placed.push({ ...r, ...best });
  }
  const lengthCm = Math.max(...placed.map((p) => p.y + p.h)) / 10;
  return { placed, width, lengthCm, buyCm: Math.ceil((lengthCm * 1.1) / 10) * 10 };
}

/** The shorter of the two waistband placements. */
export function cutPlan(pieces, fabricCm) {
  const folded = pack(pieces, fabricCm, false);
  const along = pack(pieces, fabricCm, true);
  return folded.bad || along.lengthCm < folded.lengthCm ? along : folded;
}

/** Cutting-layout diagram, drawn with the fabric length running left to right. */
export function planSvg(plan, clipId) {
  const { placed, width: FW } = plan;
  const L = plan.lengthCm * 10;
  let s = `<g transform="translate(10 40)"><clipPath id="${clipId}"><rect width="${L}" height="${FW}"/></clipPath>`
    + `<rect width="${L}" height="${FW}" fill="#fdf3f6" stroke="#b5446e" stroke-width="2"/>`
    + `<g clip-path="url(#${clipId})"><g transform="translate(0 ${FW}) rotate(-90)">`;
  for (const p of placed) {
    const d = p.along ? `M0 0H${p.c.h}V${p.c.w}H0Z` : p.halfBand ? `M0 0H${p.c.w / 2}V80H0Z` : p.c.d;
    const tx = p.onFold ? p.x : p.x - p.c.x0 + SEAM;
    s += `<g transform="translate(${tx} ${p.y + SEAM})"><path d="${d}" fill="#eab3c6" stroke="#eab3c6" stroke-width="${2 * SEAM}" stroke-linejoin="round"/><path d="${d}" fill="#f4c6d6" stroke="#b5446e" stroke-width="2"/></g>`;
  }
  s += '</g></g>';
  for (const p of placed) {
    const fz = Math.max(FW / 20, Math.min(36, p.h / 9, p.w / 6));
    const half = p.c.n.length * fz * 0.32;
    const cx = Math.max(half, Math.min(L - half, p.y + p.h / 2));
    const cy = FW - p.x - p.w / 2;
    const how = p.along ? 'along the selvedge' : p.halfBand ? 'fold pattern in half' : p.c.cut === 'p' ? 'cuts a pair' : 'on fold';
    s += `<text x="${cx}" y="${cy}" font-size="${fz}" text-anchor="middle" fill="#222">${p.c.n}</text><text x="${cx}" y="${cy + fz * 1.2}" font-size="${fz * 0.8}" text-anchor="middle" fill="#555">${how}</text>`;
  }
  s += `<line x1="0" y1="${FW}" x2="${L}" y2="${FW}" stroke="#222" stroke-width="5"/><text x="${L / 2}" y="${FW + 32}" font-size="${FW / 18}" text-anchor="middle" fill="#222">FOLD</text><text x="${L / 2}" y="-10" font-size="${FW / 18}" text-anchor="middle" fill="#222">SELVEDGES (both layers)</text></g>`;
  return { svg: s, vw: L + 20, vh: FW + 80 };
}

/** Centimetres as yards, rounded up to the nearest eighth. */
export function yards(cm) {
  const eighths = Math.ceil((cm / 91.44) * 8);
  const whole = Math.floor(eighths / 8);
  const frac = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'][eighths % 8];
  return (whole || !frac ? whole : '') + frac + ' yd';
}

/** Beginner-friendly fabrics: [easiest, once you're confident]. */
export const FABRICS = {
  dress: ['cotton poplin, chambray, linen-cotton blend', 'viscose challis, crepe'],
  top: ['cotton lawn, poplin, double gauze', 'viscose, crepe de chine'],
  skirt: ['cotton twill, lightweight denim, linen', 'corduroy, wool suiting'],
  pants: ['cotton twill, linen', 'denim, wool suiting'],
  shorts: ['cotton twill, chambray, linen', 'denim, seersucker'],
};

export const BEGINNER_FABRIC_TIP = 'Pick a stable woven fabric that doesn’t stretch or slip, with a small all-over print that hides wobbly stitches. Avoid knits, satin, chiffon and big checks or stripes for your first makes. Wash it before cutting.';

/**
 * Fabric amounts, supplies and fabric suggestions for the selected garments.
 * @param active indexes of the garments being printed
 * @param perItem pieces for each active garment (with .info)
 */
export function fabricPlan(active, perItem, pieces) {
  const widths = [[110, 45], [150, 60]].map(([cm, inch]) => ({ cm, inch, plan: cutPlan(pieces, cm) }));
  const supplies = [`All-purpose polyester thread in a matching colour: ${active.length > 1 ? active.length + ' spools' : '1 spool'}`];

  active.forEach((i, k) => {
    const it = state.items[i];
    const info = perItem[k].info;
    const who = itemLabel(i) + ': ';
    if (isBodice(it.type)) {
      supplies.push(who + 'lightweight fusible interfacing, 0.3 m, for the neck facings');
      supplies.push(who + (it.type === 'dress' ? `invisible zipper, ${info.zip} cm` : '1 small button for the back neck opening'));
      if (it.sleeves === 'none') supplies.push(who + `${info.bias} m of 12 mm single-fold bias binding for the armholes`);
    } else if (it.close === 'elastic') {
      supplies.push(who + `${info.elastic} cm of 2.5 cm wide elastic (your ${measurementsOf(it).W} cm waist, minus 5 cm for a snug fit, plus 2.5 cm overlap)`);
    } else {
      supplies.push(who + `invisible zipper, ${info.zip} cm`);
      supplies.push(who + `fusible interfacing strip, ${Math.ceil(info.band / 10)} × 4 cm, for the waistband`);
      supplies.push(who + '1 hook and eye for the waistband');
    }
  });
  const needsPin = active.some((i) => !isBodice(state.items[i].type) && state.items[i].close === 'elastic');
  supplies.push('Tools: pins, fabric scissors, paper scissors, tape, tape measure, iron, chalk or a washable marker' + (needsPin ? ', a safety pin' : ''));

  const types = [...new Set(active.map((i) => state.items[i].type))];
  const fabrics = types.map((t) => `${cap(t)}: easiest in ${FABRICS[t][0]}; once you’re confident, try ${FABRICS[t][1]}.`);
  fabrics.push('Beginner tip: ' + BEGINNER_FABRIC_TIP);

  const describe = (w) => w.plan.bad
    ? `${w.cm} cm (${w.inch} in) wide: too narrow for the ${w.plan.bad}. Choose 150 cm fabric.`
    : `${w.cm} cm (${w.inch} in) wide: buy ${(w.plan.buyCm / 100).toFixed(1)} m (${yards(w.plan.buyCm)})`;

  return { widths, supplies, fabrics, describe };
}
