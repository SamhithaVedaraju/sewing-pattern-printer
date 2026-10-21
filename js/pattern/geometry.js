// Pattern drafting: turns body measurements and garment options into pattern pieces.
// Every piece is an SVG path in millimetres, drawn on the sewing line
// (seam allowance is added around it when the piece is drawn).

import { EASE, LENGTHS, isBodice } from '../core/constants.js';
import { measurementsOf } from '../core/state.js';
import { pathLength } from '../core/dom.js';

/**
 * Half bodice (front or back) for dresses and tops, placed with the centre line on x = 0.
 * @param p draft parameters from makePieces()
 */
function bodice(p, back, type) {
  const B = p.B;
  const neck = p.neck || 'round';
  let nw = (B / 20 + 3.5) * 10;
  let nd = back ? 22 : nw + 18;
  if (neck === 'boat') { nw *= 1.35; if (!back) nd = 35; }
  else if (!back && neck === 'v') nd = nw * 1.7;
  else if (!back && neck === 'square') nd = nw + 10;

  const shoulder = B * 2.1;
  const bustW = (B + p.ease) * 2.5;
  const armDepth = (B / 8 + 10) * 10;
  const waistY = p.ht * 2.5;
  const hipY = waistY + 200;
  const hip0 = (p.H + p.ease) * 2.5;
  // With custom measurements the waist follows the person's own waist-to-hip ratio.
  const waistBlend = p.custom ? 1 + (Math.min(1.25, Math.max(0.8, p.W / p.H / 0.745)) - 1) * Math.min(1, p.fit * 2.5) : 1;
  const waistW = hip0 * (1 - p.fit * 0.4) * waistBlend;
  const hipW = Math.max(hip0, waistW);
  const hemY = type === 'top' ? waistY + [60, 210, 320][p.v + 1] : Math.max(p.v * 10 * p.ht / 165, hipY + 120);
  const hemW = type === 'top' ? hipW : hipW * p.flare;

  const neckPath = !back && neck === 'v' ? `L${nw} 0`
    : !back && neck === 'square' ? `L${nw} ${nd}L${nw} 0`
    : `Q${nw * 0.95} ${nd * 0.95} ${nw} 0`;
  const arm = `M${shoulder} 45C${shoulder - 10} 110 ${bustW - 40} ${armDepth - 25} ${bustW} ${armDepth}`;
  const tail = hemY > hipY + 5
    ? `Q${(waistW + hipW) / 2} ${(waistY + hipY) / 2} ${hipW} ${hipY}L${hemW} ${hemY}`
    : `L${waistW} ${hemY}`;
  const d = `M0 ${nd}${neckPath}L${shoulder} 45` + arm.slice(arm.indexOf('C'))
    + `Q${(bustW + waistW) / 2 + 4} ${(armDepth + waistY) / 2} ${waistW} ${waistY}${tail}L0 ${hemY}Z`;

  return { d, arm: pathLength(arm), w: Math.max(bustW, hemW, hipW, waistW), h: hemY, bw: bustW, ad: armDepth, wy: waistY };
}

/** Set-in sleeve whose cap length matches the armhole (front + back, plus 3% ease). */
function sleeve(p, front, kind) {
  const bicep = (p.B * 0.32 + 2) * 10;
  const target = 2 * front.arm * 1.03;
  const cap = (c) => `M0 ${c}C${bicep * 0.05} ${c * 0.55} ${bicep * 0.2} 0 ${bicep / 2} 0C${bicep * 0.8} 0 ${bicep * 0.95} ${c * 0.55} ${bicep} ${c}`;
  let capH = 120;
  let best = 1e9;
  for (let c = 60; c <= 230; c += 2) {
    const err = Math.abs(pathLength(cap(c)) - target);
    if (err < best) { best = err; capH = c; }
  }
  const len = kind === 'short' ? 190 : 570;
  const cuff = kind === 'short' ? bicep * 0.9 : bicep * 0.72;
  const inset = (bicep - cuff) / 2;
  return { d: cap(capH) + `L${bicep - inset} ${len}L${inset} ${len}Z`, w: bicep, h: len, ch: capH };
}

/** One leg panel (front or back) for pants and shorts. */
function leg(p, back, short) {
  const hipF = (p.H + 6) * 2.5 + (back ? 10 : 0);
  const waistF = p.elastic ? hipF : (p.W + 4) * 2.5 + (back ? 10 : 0);
  const crotchDepth = p.ht * 1.6 + (p.H - 94) + (back ? 10 : 0);
  const crotchExt = hipF * (back ? 0.38 : 0.22);
  const centre = (hipF - crotchExt) / 2;
  const hipDepth = 200;
  const inseam = short ? (p.v === 1 ? 220 : 90) * p.ht / 165 : p.ht * 4.6 * p.v;
  const halfHem = p.flare * (p.H + p.ease) * 1.25;
  const hemY = crotchDepth + inseam;
  return {
    d: `M0 0L${waistF} 0Q${waistF + (hipF - waistF) * 0.4} ${hipDepth * 0.7} ${hipF} ${hipDepth}L${centre + halfHem} ${hemY}L${centre - halfHem} ${hemY}L${-crotchExt} ${crotchDepth}Q0 ${crotchDepth} 0 ${crotchDepth * 0.5}Z`,
    x0: -crotchExt, w: Math.max(hipF, centre + halfHem), h: hemY, gx: centre,
  };
}

const ZIPPERS = [18, 20, 23, 25, 30, 35, 40, 45, 50, 55, 60];
const zipperFor = (cm) => ZIPPERS.find((z) => z >= cm) || 60;

/**
 * All pattern pieces for one garment.
 * Each piece: { n: name, note: cutting note, d: path, w, h, x0, fold, gx/g1/g2: grainline, ty: label y, cut }
 * `cut` tells the fabric planner how it is cut: f1 = 1 on fold, f2 = 2 on fold, p = mirror pair, b = waistband.
 * The returned array also carries `info`: zipper length, elastic length, waistband length, bias binding.
 */
export function makePieces(item, label) {
  const m = measurementsOf(item);
  const type = item.type;
  const elastic = !isBodice(type) && item.close === 'elastic';
  const p = {
    B: m.B, W: m.W, H: m.H, ht: m.ht,
    ease: EASE[item.fit], flare: item.flare / 100, fit: item.waist / 100,
    neck: item.neck, v: LENGTHS[type][item.length], elastic, custom: item.size === 'Custom',
  };
  const out = [];
  const info = (out.info = { elastic: Math.round(m.W - 2.5) });
  const add = (name, note, geo, extra) => out.push({ n: label + ' ' + name, note, fold: 0, x0: 0, ...geo, ...extra });
  const band = (elasticLen) => {
    const L = elastic ? elasticLen : (p.W + 4) * 10 + 30;
    info.band = L;
    add('WAISTBAND', elastic ? 'Cut 1 (elastic casing)' : 'Cut 1', { d: `M0 0H${L}V80H0Z`, w: L, h: 80 }, { gx: L / 2, g1: 15, g2: 65, ty: 45, cut: 'b' });
  };

  if (isBodice(type)) {
    const front = bodice(p, false, type);
    const back = bodice(p, true, type);
    add('FRONT', 'Cut 1 on fold', front, { fold: 1, gx: front.bw * 0.45, g1: front.ad + 30, g2: front.h - 40, ty: front.wy, cut: 'f1' });
    add('BACK', 'Cut 1 on fold', back, { fold: 1, gx: back.bw * 0.45, g1: back.ad + 30, g2: back.h - 40, ty: back.wy, cut: 'f1' });
    if (item.sleeves !== 'none') {
      const s = sleeve(p, front, item.sleeves);
      add('SLEEVE', 'Cut 2', s, { gx: s.w / 2, g1: s.ch + 20, g2: s.h - 20, ty: s.ch + 60, cut: 'p' });
    }
    info.zip = zipperFor((front.wy - front.ad) / 10 + 15);
    info.bias = Math.ceil((2 * (front.arm + back.arm) + 100) / 100) / 10;
  } else if (type === 'skirt') {
    info.zip = 18;
    const hip = (p.H + 4) * 2.5;
    const waist = elastic ? hip : (p.W + 4) * 2.5;
    const hipDepth = 200;
    const len = Math.max(p.v * 10 * p.ht / 165, hipDepth + 40);
    const hem = hip * p.flare;
    add('PANEL', 'Cut 2 on fold (front + back)',
      { d: `M0 0L${waist} 0Q${(waist + hip) / 2} ${hipDepth * 0.55} ${hip} ${hipDepth}L${hem} ${len}L0 ${len}Z`, w: Math.max(hem, hip), h: len },
      { fold: 1, gx: hip * 0.45, g1: 60, g2: len - 40, ty: hipDepth, cut: 'f2' });
    band((p.H + 4) * 10);
  } else {
    info.zip = 20;
    const short = type === 'shorts';
    const front = leg(p, false, short);
    const back = leg(p, true, short);
    add('FRONT', 'Cut 2 (mirror pair)', front, { g1: 80, g2: front.h - 40, ty: front.h * 0.5, cut: 'p' });
    add('BACK', 'Cut 2 (mirror pair)', back, { g1: 80, g2: back.h - 40, ty: back.h * 0.5, cut: 'p' });
    band((p.H + 6) * 10 + 20);
  }
  return out;
}
