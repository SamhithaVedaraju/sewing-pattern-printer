// Step diagrams drawn from the garment's own pattern pieces, so every picture shows
// the real shapes (its neckline, sleeves, flare, length) with the seam being sewn highlighted.
// All coordinates are the pattern's millimetres; each diagram crops to the area that matters.

const RIGHT = '#f4c6d6';      // right side of the fabric
const RIGHT_LINE = '#b5446e';
const WRONG = '#f7f7f7';      // wrong side
const WRONG_LINE = '#7a7a7a';
const SEW = '#b5446e';        // the seam to sew
const NOTE = '#1e6b5a';       // other marks (zipper, folds)
const TEXT = '#1b2528';

let uid = 0;

/** Probe path used to measure and sample edges. */
function probe(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p;
}

const find = (pieces, name) => pieces.find((p) => p.n.endsWith(' ' + name));

/** The [x, y] a path starts at. */
const startOf = (d) => d.match(/^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/).slice(1).map(Number);

/** Wrap content in a cropped frame with a caption. Returns { svg, vw, vh } for a 0-origin viewBox. */
function frame(content, [x0, y0, x1, y1], caption) {
  const w = x1 - x0;
  const h = y1 - y0;
  const fs = Math.max(w, h * 0.8) / 14;
  const capH = fs * 1.8;
  const svg = `<rect width="${w}" height="${h + capH}" fill="#fff"/>`
    + `<g transform="translate(${-x0} ${-y0})">${content}</g>`
    + `<text x="${w / 2}" y="${h + capH * 0.7}" font-size="${fs}" font-weight="700" text-anchor="middle" fill="${TEXT}">${caption}</text>`;
  return { svg, vw: w, vh: h + capH };
}

/** Stroke widths and font size scaled to the diagram. */
const scale = (box) => {
  const s = Math.max(box[2] - box[0], box[3] - box[1]);
  return { line: s / 170, sew: s / 70, font: s / 16 };
};

const shape = (piece, fill, stroke, k, tx = 0, ty = 0, flip = false, extra = '') =>
  `<path d="${piece.d}" transform="translate(${tx} ${ty})${flip ? ' scale(-1 1)' : ''}${extra}" fill="${fill}" stroke="${stroke}" stroke-width="${k.line}" stroke-linejoin="round"/>`;

const seam = (d, k, tx = 0, ty = 0, flip = false, extra = '', colour = SEW) =>
  `<path d="${d}" transform="translate(${tx} ${ty})${flip ? ' scale(-1 1)' : ''}${extra}" fill="none" stroke="${colour}" stroke-width="${k.sew}" stroke-dasharray="${k.sew * 2.2} ${k.sew * 1.3}" stroke-linecap="round"/>`;

const label = (text, x, y, k, anchor = 'start', colour = TEXT) =>
  `<text x="${x}" y="${y}" font-size="${k.font * 0.75}" text-anchor="${anchor}" fill="${colour}">${text}</text>`;

/** Bounds of a piece (on the sewing line), padded. */
const bounds = (p, pad, tx = 0, ty = 0) => [p.x0 + tx - pad, ty - pad, p.w + tx + pad, p.h + ty + pad];

/** A band of colour hugging an edge on the inside of a piece (facing, hem turn-up). */
function band(piece, edge, width, colour, k) {
  const id = `dg${++uid}`;
  return `<clipPath id="${id}"><path d="${piece.d}"/></clipPath><path d="${edge}" clip-path="url(#${id})" fill="none" stroke="${colour}" stroke-width="${width * 2}" stroke-linejoin="round"/>`
    + `<path d="${piece.d}" fill="none" stroke="${RIGHT_LINE}" stroke-width="${k.line}"/>`;
}

/** Small cuts across an edge, used for clipping curves. */
function clips(edge, k, count = 7) {
  const p = probe(edge);
  const len = p.getTotalLength();
  let s = '';
  for (let i = 1; i < count; i++) {
    const at = (len * i) / count;
    const a = p.getPointAtLength(Math.max(0, at - 1));
    const b = p.getPointAtLength(Math.min(len, at + 1));
    const nx = -(b.y - a.y), ny = b.x - a.x;
    const n = Math.hypot(nx, ny) || 1;
    const c = p.getPointAtLength(at);
    const L = k.font * 0.6;
    s += `<line x1="${c.x}" y1="${c.y}" x2="${c.x + (nx / n) * L}" y2="${c.y + (ny / n) * L}" stroke="${TEXT}" stroke-width="${k.line * 1.6}"/>`;
  }
  return s;
}

/** Split an edge where it crosses two heights: the parts above, between and below, as paths. */
function splitAtY(edge, yStart, yEnd) {
  const p = probe(edge);
  const len = p.getTotalLength();
  const parts = [[], [], []];
  for (let i = 0; i <= 200; i++) {
    const pt = p.getPointAtLength((len * i) / 200);
    const part = pt.y < yStart ? 0 : pt.y <= yEnd ? 1 : 2;
    parts[part].push(`${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
  }
  return parts.map((pts) => (pts.length > 1 ? 'M' + pts.join('L') : ''));
}

// ---------------------------------------------------------------- diagrams

/** All pieces side by side, with fold edges and grainlines: what to cut. */
function cut({ pieces }) {
  const gap = 60;
  let x = 0, s = '', maxH = 0, minX = 0;
  const k = scale([0, 0, pieces.reduce((t, p) => t + (p.w - p.x0) + gap, 0), Math.max(...pieces.map((p) => p.h))]);
  for (const p of pieces) {
    const tx = x - p.x0;
    s += shape(p, RIGHT, RIGHT_LINE, k, tx);
    if (p.fold) {
      s += `<line x1="${tx}" y1="0" x2="${tx}" y2="${p.h}" stroke="${NOTE}" stroke-width="${k.sew}"/>`
        + `<text transform="translate(${tx + k.font * 0.75} ${p.h * 0.78}) rotate(-90)" font-size="${k.font * 0.6}" text-anchor="middle" fill="${NOTE}">FOLD</text>`;
    }
    if (p.gx != null) s += `<line x1="${tx + p.gx}" y1="${p.g1}" x2="${tx + p.gx}" y2="${p.g2}" stroke="${TEXT}" stroke-width="${k.line * 1.5}"/>`;
    const name = p.n.split(' ').slice(-1)[0].toLowerCase();
    s += label(name + (p.cut === 'p' ? ' ×2' : p.cut === 'f2' ? ' ×2' : ''), tx + (p.gx ?? p.w / 2) + k.font * 0.3, Math.min(p.h - k.font, (p.ty ?? p.h / 2)), k);
    x += p.w - p.x0 + gap;
    maxH = Math.max(maxH, p.h);
    minX = Math.min(minX, tx + p.x0);
  }
  return frame(s, [minX - gap / 2, -gap / 2, x, maxH + gap / 2], 'Cut out every piece');
}

/** Front laid on back, right sides together, shoulder seam highlighted. */
function shoulders({ pieces }) {
  const front = find(pieces, 'FRONT'), back = find(pieces, 'BACK');
  const box = [-40, -60, front.sh + 80, front.ad + 120];
  const k = scale(box);
  const off = k.font * 0.5;
  const s = shape(back, RIGHT, RIGHT_LINE, k, off, off) + shape(front, WRONG, WRONG_LINE, k)
    + seam(front.edges.shoulder, k)
    + label('sew the shoulder', front.sh * 0.55, -k.font * 0.5, k, 'middle', SEW)
    + label('front, wrong side up', front.bw * 0.15, front.ad * 0.75, k);
  return frame(s, box, 'Shoulders: right sides together');
}

/** Facing band traced along the neckline. */
function facing({ pieces }) {
  const front = find(pieces, 'FRONT');
  const box = [-30, -40, front.sh + 60, Math.min(front.h, front.ad + 160)];
  const k = scale(box);
  const s = shape(front, RIGHT, RIGHT_LINE, k) + band(front, front.edges.neck + front.edges.shoulder.replace('M', 'L'), 60, '#c9e3d8', k)
    + label('facing, 6 cm wide', front.sh * 0.2, startOf(front.edges.neck)[1] + 60 + k.font, k, 'start', NOTE);
  return frame(s, box, 'Trace a 6 cm facing along the neckline');
}

/** Neckline sewn to the facing, with clips into the curve. */
function neckline({ pieces, item }) {
  const front = find(pieces, 'FRONT');
  const box = [-30, -40, front.sh + 60, front.ad + 60];
  const k = scale(box);
  const s = shape(front, RIGHT, RIGHT_LINE, k) + seam(front.edges.neck, k) + clips(front.edges.neck, k)
    + label(item.neck === 'v' ? 'snip right into the V' : item.neck === 'square' ? 'snip into each corner' : 'clip the curve', front.sh * 0.35, front.ad * 0.7, k);
  return frame(s, box, 'Sew the neckline, then clip it');
}

/** Sleeve cap pinned into the armhole. */
function sleeve({ pieces }) {
  const front = find(pieces, 'FRONT'), sl = find(pieces, 'SLEEVE');
  if (!sl) return null;
  // Hang the sleeve from the shoulder point, angled out like an arm.
  const angle = -55;
  const place = ` rotate(${angle}) translate(${-sl.w / 2} 0)`;
  const tx = front.sh, ty = 45;
  const reach = Math.sin((-angle * Math.PI) / 180) * sl.h; // how far the sleeve reaches sideways
  const box = [-20, -Math.min(sl.w * 0.45, 160), Math.max(front.bw, front.sh + reach + sl.w * 0.3) + 30, front.ad + Math.min(sl.h * 0.6, 260)];
  const k = scale(box);
  const s = shape(front, RIGHT, RIGHT_LINE, k) + seam(front.edges.arm, k)
    + `<g transform="translate(${tx} ${ty})${place}">${shape(sl, WRONG, WRONG_LINE, k)}${seam(sl.edges.cap, k)}</g>`
    + label('match the top of the cap to the shoulder seam', box[0] + k.font * 0.3, box[1] + k.font, k);
  return frame(s, box, 'Pin the sleeve cap into the armhole');
}

/** Side seams (and the zipper gap for dresses and skirts). */
function sides({ pieces, item }) {
  const main = find(pieces, 'FRONT') || find(pieces, 'PANEL');
  const back = find(pieces, 'BACK') || main;
  const box = bounds(main, 60);
  const k = scale(box);
  const off = k.font * 0.4;
  let s = shape(back, RIGHT, RIGHT_LINE, k, off, off) + shape(main, WRONG, WRONG_LINE, k);
  const zipCm = pieces.info.zip;
  const zip = item.type === 'dress' ? [main.ad + 30, main.ad + 30 + zipCm * 10]
    : item.type === 'skirt' && item.close !== 'elastic' ? [0, zipCm * 10] : null;
  if (zip) {
    const [above, gap, below] = splitAtY(main.edges.side, zip[0], zip[1]);
    if (above) s += seam(above, k);
    if (below) s += seam(below, k);
    if (gap) s += `<path d="${gap}" fill="none" stroke="${NOTE}" stroke-width="${k.sew * 1.8}" stroke-linecap="round"/>`;
    const mid = gap.split('L')[Math.floor(gap.split('L').length / 2)].replace('M', '').split(' ').map(Number);
    s += label(`${zipCm} cm`, mid[0] - k.font * 0.4, mid[1] - k.font * 0.3, k, 'end', NOTE)
      + label('zipper', mid[0] - k.font * 0.4, mid[1] + k.font * 0.5, k, 'end', NOTE);
  } else {
    s += seam(main.edges.side, k);
  }
  return frame(s, box, item.type === 'skirt' ? 'Sew the side seams' : 'Sew the side seams, right sides together');
}

/** Bias binding around a sleeveless armhole. */
function armhole({ pieces }) {
  const front = find(pieces, 'FRONT');
  const box = [front.sh * 0.4, -40, front.bw + 70, front.ad + 90];
  const k = scale(box);
  const s = shape(front, RIGHT, RIGHT_LINE, k) + `<path d="${front.edges.arm}" fill="none" stroke="${NOTE}" stroke-width="${k.sew * 2.2}" stroke-linecap="round" opacity=".55"/>` + seam(front.edges.arm, k)
    + label('bias binding', front.bw * 0.72, front.ad * 0.45, k, 'end', NOTE);
  return frame(s, box, 'Bind the armholes');
}

/** Hem turned up along the bottom edge. */
function hemline({ pieces, item }) {
  const legs = item.type === 'pants' || item.type === 'shorts';
  const main = find(pieces, 'FRONT') || find(pieces, 'PANEL');
  const top = Math.max(0, main.h - 260);
  const box = [main.x0 - 40, top, main.w + 40, main.h + 60];
  const k = scale(box);
  const s = shape(main, RIGHT, RIGHT_LINE, k) + band(main, main.edges.hem, 15, '#f0b9cc', k) + seam(main.edges.hem, k, 0, -10)
    + label('fold up 0.5 cm, then 1 cm', (main.x0 + main.w) / 2, main.h - k.font * 1.6, k, 'middle');
  return frame(s, box, legs ? 'Hem each leg' : 'Hem the bottom edge');
}

/** Sleeve hem. */
function sleevehem({ pieces }) {
  const sl = find(pieces, 'SLEEVE');
  if (!sl) return null;
  const box = [-30, Math.max(0, sl.h - 220), sl.w + 30, sl.h + 50];
  const k = scale(box);
  const s = shape(sl, RIGHT, RIGHT_LINE, k) + band(sl, sl.edges.hem, 15, '#f0b9cc', k) + seam(sl.edges.hem, k, 0, -10)
    + label('fold up 0.5 cm, then 1 cm', sl.w / 2, sl.h - k.font * 1.6, k, 'middle');
  return frame(s, box, 'Hem the sleeves');
}

/** Waistband joined to the waist edge. */
function waistband({ pieces }) {
  const main = find(pieces, 'PANEL') || find(pieces, 'FRONT');
  const wTop = probe(main.edges.waist).getTotalLength();
  const box = [main.x0 - 40, -150, main.w + 40, 220];
  const k = scale(box);
  const s = shape(main, RIGHT, RIGHT_LINE, k)
    + `<rect x="0" y="-110" width="${wTop}" height="80" fill="${WRONG}" stroke="${WRONG_LINE}" stroke-width="${k.line}"/>`
    + `<line x1="0" y1="-70" x2="${wTop}" y2="-70" stroke="${WRONG_LINE}" stroke-width="${k.line}" stroke-dasharray="${k.line * 6} ${k.line * 4}"/>`
    + seam(main.edges.waist, k)
    + label('waistband, folded in half', wTop + 15, -60, k)
    + label('sew to the waist', wTop / 2, k.font * 1.2, k, 'middle', SEW);
  return frame(s, box, 'Attach the waistband');
}

/** Each leg: front on back, inside leg and side seams. */
function legs({ pieces }) {
  const front = find(pieces, 'FRONT'), back = find(pieces, 'BACK');
  const box = bounds(back, 60);
  const k = scale(box);
  const off = k.font * 0.4;
  const s = shape(back, RIGHT, RIGHT_LINE, k, off, off) + shape(front, WRONG, WRONG_LINE, k)
    + seam(front.edges.inseam, k) + seam(front.edges.side, k)
    + label('inside leg', front.x0 + k.font * 0.2, front.h * 0.7, k)
    + label('side seam', front.w * 0.75, front.h * 0.45, k);
  return frame(s, box, 'Sew the inside leg and side seams');
}

/** The two legs joined along the curved crotch seam. */
function crotch({ pieces }) {
  const front = find(pieces, 'FRONT'), back = find(pieces, 'BACK');
  // Front leg mirrored on the left, back leg on the right: the crotch curves meet in the middle.
  const fx = -front.x0, bx = fx + 30 - back.x0;
  const top = 0, bottom = Math.max(front.h, back.h) * 0.6;
  const box = [fx - front.w - 30, top - 50, bx + back.w + 30, bottom];
  const k = scale(box);
  const s = shape(front, WRONG, WRONG_LINE, k, fx, 0, true) + shape(back, RIGHT, RIGHT_LINE, k, bx)
    + seam(front.edges.crotch, k, fx, 0, true) + seam(back.edges.crotch, k, bx)
    + label('crotch seam: sew it twice', (fx + bx) / 2, -k.font * 0.6, k, 'middle', SEW);
  return frame(s, box, 'Join the legs at the crotch');
}

export const DIAGRAMS = { cut, shoulders, facing, neckline, sleeve, sides, armhole, hemline, sleevehem, waistband, legs, crotch };

/** Which garment diagrams make sense for a garment, for Claude to choose from. */
export function diagramsFor(item) {
  if (item.type === 'dress' || item.type === 'top') {
    return ['cut', 'shoulders', 'facing', 'neckline', 'sides', 'hemline', ...(item.sleeves === 'none' ? ['armhole'] : ['sleeve', 'sleevehem'])];
  }
  if (item.type === 'skirt') return ['cut', 'sides', 'waistband', 'hemline'];
  return ['cut', 'legs', 'crotch', 'waistband', 'hemline'];
}

// ---------------------------------------------------------------- finished-garment sketch

/** A front view of the finished garment, built by mirroring the pattern pieces. */
export function garmentSketch(pieces, item) {
  let s = '', box;
  if (item.type === 'dress' || item.type === 'top') {
    const front = find(pieces, 'FRONT'), sl = find(pieces, 'SLEEVE');
    const k = scale([-front.w, 0, front.w, front.h]);
    if (sl) {
      for (const side of [1, -1]) {
        s += `<g transform="translate(${side * front.sh} 45) scale(${side} 1) rotate(-28) translate(${-sl.w / 2} 0)">${shape(sl, RIGHT, RIGHT_LINE, k)}</g>`;
      }
    }
    s += shape(front, RIGHT, RIGHT_LINE, k) + shape(front, RIGHT, RIGHT_LINE, k, 0, 0, true);
    // The centre front is a fold, not a seam: paint over the line where the halves meet.
    const neckDepth = startOf(front.edges.neck)[1];
    s += `<line x1="0" y1="${neckDepth + k.line * 2}" x2="0" y2="${front.h - k.line * 1.5}" stroke="${RIGHT}" stroke-width="${k.line * 3.5}"/>`;
    s += `<path d="${front.edges.neck}" fill="none" stroke="${RIGHT_LINE}" stroke-width="${k.line * 1.5}"/><path d="${front.edges.neck}" transform="scale(-1 1)" fill="none" stroke="${RIGHT_LINE}" stroke-width="${k.line * 1.5}"/>`;
    const reach = sl ? front.sh + sl.h * 0.5 : front.w;
    box = [-Math.max(reach, front.w) - 30, -30, Math.max(reach, front.w) + 30, front.h + 30];
  } else if (item.type === 'skirt') {
    const panel = find(pieces, 'PANEL');
    const k = scale([-panel.w, 0, panel.w, panel.h]);
    const waist = probe(panel.edges.waist).getTotalLength();
    s += shape(panel, RIGHT, RIGHT_LINE, k, 0, 40) + shape(panel, RIGHT, RIGHT_LINE, k, 0, 40, true)
      + `<line x1="0" y1="${40 + k.line * 2}" x2="0" y2="${panel.h + 40 - k.line * 1.5}" stroke="${RIGHT}" stroke-width="${k.line * 3.5}"/>`
      + `<rect x="${-waist}" y="0" width="${waist * 2}" height="40" fill="${RIGHT}" stroke="${RIGHT_LINE}" stroke-width="${k.line}"/>`;
    box = [-panel.w - 30, -30, panel.w + 30, panel.h + 70];
  } else {
    const front = find(pieces, 'FRONT');
    const k = scale([-front.w, 0, front.w, front.h]);
    // Shift each leg so its crotch point sits on the centre line, then fill the front between them.
    const ce = -front.x0;
    const crotchY = startOf(front.edges.crotch)[1];
    const waist = probe(front.edges.waist).getTotalLength();
    s += shape(front, RIGHT, RIGHT_LINE, k, ce, 40) + shape(front, RIGHT, RIGHT_LINE, k, -ce, 40, true)
      // Above the crotch the trousers are one solid front.
      + `<rect x="${-ce}" y="40" width="${ce * 2}" height="${crotchY - k.line}" fill="${RIGHT}"/>`
      + `<line x1="0" y1="40" x2="0" y2="${40 + crotchY * 0.7}" stroke="${RIGHT_LINE}" stroke-width="${k.line}"/>`
      + `<rect x="${-ce - waist}" y="0" width="${(ce + waist) * 2}" height="40" fill="${RIGHT}" stroke="${RIGHT_LINE}" stroke-width="${k.line}"/>`;
    box = [-ce - front.w - 30, -30, ce + front.w + 30, front.h + 70];
  }
  const w = box[2] - box[0], h = box[3] - box[1];
  return { svg: `<g transform="translate(${-box[0]} ${-box[1]})">${s}</g>`, vw: w, vh: h };
}
