// Lays pattern pieces out full-size and splits them into printable, overlapping sheets.

import { SEAM, LAYOUT_MARGIN as M, SHEET_MARGIN as MG, SHEET_OVERLAP as OV, INK } from '../core/constants.js';
import { esc, wrapText } from '../core/dom.js';

const column = (c) => String.fromCharCode(65 + c);
export const sheetName = (r, c) => `${r + 1}${column(c)}`;

/** Draw all pieces of a layout: cut line, sewing line, fold, grainline and labels. */
function drawPieces(idPrefix, layout, title) {
  let s = `<rect width="${layout.W}" height="${layout.H}" fill="#fff"/>`
    + `<rect x="${M}" y="${M}" width="50" height="50" fill="none" stroke="#000" stroke-width=".6"/>`
    + `<text x="${M + 25}" y="${M + 27}" font-size="6" text-anchor="middle" fill="#000">5 × 5 cm</text>`
    + `<text x="${M + 25}" y="${M + 36}" font-size="4" text-anchor="middle" fill="#000">check scale</text>`
    + `<text x="${M + 65}" y="${M + 22}" font-size="9" fill="#000" font-family="Georgia,serif">${esc(title)}</text>`
    + `<text x="${M + 65}" y="${M + 36}" font-size="5" fill="#000">Solid outer line = cut · dashed line = sew · seam allowance 1.5 cm</text>`;
  layout.pieces.forEach((c, i) => {
    const id = `${idPrefix}c${i}`;
    s += `<g transform="translate(${c.ox} ${c.oy})">`;
    // Fold pieces are clipped at the fold so no seam allowance is added there.
    s += c.fold ? `<clipPath id="${id}"><rect x="0" y="-60" width="${c.w + 80}" height="${c.h + 120}"/></clipPath><g clip-path="url(#${id})">` : '<g>';
    s += `<path d="${c.d}" fill="none" stroke="${INK.cut}" stroke-width="${2 * SEAM + 0.8}" stroke-linejoin="round"/>`
      + `<path d="${c.d}" fill="none" stroke="#fff" stroke-width="${2 * SEAM}" stroke-linejoin="round"/>`
      + `<path d="${c.d}" fill="#fff" stroke="${INK.sew}" stroke-width=".7" stroke-dasharray="4 2"/></g>`;
    if (c.fold) {
      s += `<line x1="0" y1="0" x2="0" y2="${c.h}" stroke="${INK.cut}" stroke-width="1.4"/><text transform="translate(8 ${c.h / 2}) rotate(-90)" font-size="6" fill="${INK.cut}" text-anchor="middle">FOLD</text>`;
    }
    s += `<line x1="${c.gx}" y1="${c.g1}" x2="${c.gx}" y2="${c.g2}" stroke="${INK.cut}" stroke-width=".8"/>`
      + `<path d="M${c.gx} ${c.g1}l-3 8h6zM${c.gx} ${c.g2}l-3 -8h6z" fill="${INK.cut}"/>`
      + `<text x="${c.gx + 8}" y="${c.ty}" font-size="10" font-weight="700" fill="${INK.cut}">${c.n}</text>`
      + `<text x="${c.gx + 8}" y="${c.ty + 10}" font-size="6" fill="${INK.cut}">${c.note}</text>`
      + `<text x="${c.gx + 8}" y="${c.ty + 18}" font-size="5" fill="${INK.muted}">grainline ↕</text></g>`;
  });
  return s;
}

/** Grid of sheets: filled where a sheet must be printed, `current` highlighted. */
export function sheetMap(cols, rows, needed, cell, current, withLabels) {
  let s = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const need = needed[r][c];
      const on = current && current[0] === r && current[1] === c;
      s += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${on ? INK.sew : need ? INK.pale : '#fff'}" stroke="#888" stroke-width="${cell / 25}" ${need ? '' : 'stroke-dasharray="2 2"'}/>`;
      if (withLabels && need) s += `<text x="${c * cell + cell / 2}" y="${r * cell + cell / 2 + cell * 0.08}" font-size="${cell * 0.3}" text-anchor="middle" fill="#000">${sheetName(r, c)}</text>`;
    }
  }
  return s;
}

/**
 * Place pieces in rows and work out which sheets of the chosen paper they cover.
 * Mutates each piece with its position (ox, oy).
 */
export function layoutPattern(pieces, [PW, PH]) {
  const pw = PW - 2 * MG;
  const ph = PH - 2 * MG;
  const sx = pw - OV;
  const sy = ph - OV;
  const maxW = Math.max(3 * sx, ...pieces.map((c) => c.w - c.x0 + SEAM * 2 + 40));
  let x = M, y = M + 75, rowH = 0, width = 0;
  for (const c of pieces) {
    const w = c.w - c.x0;
    if (x > M && x + w + SEAM * 2 > maxW) { x = M; y += rowH + SEAM * 2 + 25; rowH = 0; }
    c.ox = x - c.x0 + (c.fold ? 0 : SEAM);
    c.oy = y;
    x += w + SEAM * 2 + 25;
    rowH = Math.max(rowH, c.h);
    width = Math.max(width, x);
  }
  const layout = { pieces, W: width + M, H: y + rowH + SEAM + M };
  const boxes = [[M - 2, M - 2, M + 400, M + 55], ...pieces.map((c) => [c.ox + c.x0 - SEAM, c.oy - SEAM, c.ox + c.w + SEAM, c.oy + c.h + SEAM])];
  const cols = Math.max(1, Math.ceil((layout.W - OV) / sx));
  const rows = Math.max(1, Math.ceil((layout.H - OV) / sy));
  const needed = [];
  let count = 0;
  for (let r = 0; r < rows; r++) {
    needed[r] = [];
    for (let c = 0; c < cols; c++) {
      const a = c * sx, b = r * sy;
      const need = boxes.some((q) => q[0] < a + pw && q[2] > a && q[1] < b + ph && q[3] > b);
      needed[r][c] = need;
      if (need) count++;
    }
  }
  return { layout, cols, rows, needed, count, pw, ph, sx, sy, paper: [PW, PH] };
}

/** The whole pattern as one SVG, optionally showing how it splits into sheets. */
export function previewSvg(grid, title, showSheets) {
  const { layout, cols, rows, needed, pw, ph, sx, sy } = grid;
  let overlay = '';
  if (showSheets) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!needed[r][c]) continue;
        overlay += `<rect x="${c * sx}" y="${r * sy}" width="${pw}" height="${ph}" fill="none" stroke="${INK.sew}" stroke-width="1.5" stroke-dasharray="8 5"/><text x="${c * sx + pw / 2}" y="${r * sy + ph / 2}" font-size="${Math.min(pw, ph) / 5}" text-anchor="middle" fill="${INK.sew}" opacity=".25">${sheetName(r, c)}</text>`;
      }
    }
  }
  return `<svg viewBox="0 0 ${layout.W} ${layout.H}" role="img" aria-label="Full-size pattern layout">${drawPieces('o', layout, title)}${overlay}</svg>`;
}

/** Wrap page content in a full-size SVG of the paper. */
export const pageSvg = (inner, [PW, PH]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}" font-family="Arial,sans-serif"><rect width="${PW}" height="${PH}" fill="#fff"/>${inner}</svg>`;

/** One printable page per needed sheet, with cut lines, overlap tabs and a mini map. */
export function patternPages(grid, title) {
  const { layout, cols, rows, needed, pw, ph, sx, sy, paper } = grid;
  const pages = [];
  const tab = `fill="${INK.sew}" fill-opacity=".1" stroke="${INK.sew}" stroke-width=".3" stroke-dasharray="2 1.5"`;
  const cell = Math.min(4, 30 / Math.max(cols, rows));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!needed[r][c]) continue;
      const x0 = c * sx, y0 = r * sy, name = sheetName(r, c);
      let s = `<svg x="${MG}" y="${MG}" width="${pw}" height="${ph}" viewBox="${x0} ${y0} ${pw} ${ph}">${drawPieces(`s${r}_${c}`, layout, title)}`;
      if (c < cols - 1) s += `<rect x="${x0 + pw - OV}" y="${y0}" width="${OV}" height="${ph}" ${tab}/><text transform="translate(${x0 + pw - 3} ${y0 + ph / 2}) rotate(-90)" font-size="3.5" text-anchor="middle" fill="#000">TAB: goes under ${sheetName(r, c + 1)}</text>`;
      if (r < rows - 1) s += `<rect x="${x0}" y="${y0 + ph - OV}" width="${pw}" height="${OV}" ${tab}/><text x="${x0 + pw / 2}" y="${y0 + ph - 3.5}" font-size="3.5" text-anchor="middle" fill="#000">TAB: goes under ${sheetName(r + 1, c)}</text>`;
      s += `<path d="M${x0} ${y0 + ph}V${y0}H${x0 + pw}" fill="none" stroke="#000" stroke-width=".5"/>`
        + `<text x="${x0 + pw / 2}" y="${y0 + 4}" font-size="3.5" text-anchor="middle" fill="#000">✂ cut along line${r > 0 ? ' · lay over ' + sheetName(r - 1, c) : ''}</text>`
        + `<text transform="translate(${x0 + 4} ${y0 + ph / 2}) rotate(-90)" font-size="3.5" text-anchor="middle" fill="#000">✂ cut along line${c > 0 ? ' · lay over ' + sheetName(r, c - 1) : ''}</text>`
        + `<rect x="${x0 + 5}" y="${y0 + ph - OV - cell * rows - 8}" width="${cell * cols + 4}" height="${cell * rows + 4}" fill="#fff"/>`
        + `<g transform="translate(${x0 + 7} ${y0 + ph - OV - cell * rows - 6})">${sheetMap(cols, rows, needed, cell, [r, c])}</g>`
        + `<text x="${x0 + pw - OV - 3}" y="${y0 + ph - OV - 3}" font-size="9" font-weight="700" text-anchor="end" fill="${INK.sew}">${name}</text></svg>`;
      pages.push({ svg: pageSvg(s, paper), label: 'Sheet ' + name });
    }
  }
  return pages;
}

/**
 * Text pages for print. `text` writes wrapped lines, `figure` places a diagram,
 * and both start a new page when the current one is full.
 */
export class Pager {
  constructor([PW, PH], title) {
    this.PW = PW;
    this.PH = PH;
    this.title = title;
    this.fs = Math.max(2.4, Math.min(4, PW / 52));
    this.chars = Math.floor((PW - 2 * MG - 12) / (this.fs * 0.52));
    this.pages = [];
    this.s = '';
    this.y = 0;
    this.count = 0;
    this.newPage();
  }

  newPage() {
    if (this.count) this.pages.push(this.s);
    this.count++;
    this.y = MG + this.fs * 3;
    this.s = `<text x="${MG + 6}" y="${this.y}" font-size="${this.fs * 2}" font-family="Georgia,serif" font-weight="700" fill="#000">${esc(this.title)}${this.count > 1 ? ' (continued)' : ''}</text>`;
    this.y += this.fs * 3;
  }

  /** Start a new page unless `h` mm still fit. */
  room(h) {
    if (this.y + h > this.PH - MG) this.newPage();
  }

  gap(lines = 1) {
    this.y += this.fs * lines;
  }

  text(t, bold = false, scale = 1) {
    for (const line of wrapText(t, Math.floor(this.chars / scale))) {
      this.room(0);
      this.s += `<text x="${MG + 6}" y="${this.y}" font-size="${this.fs * scale}" ${bold ? 'font-weight="700"' : ''} fill="#000">${esc(line)}</text>`;
      this.y += this.fs * scale * 1.5;
    }
  }

  figure(svg, vw, vh, w) {
    const h = (w * vh) / vw;
    this.room(h);
    const top = this.y - this.fs * 0.8;
    this.s += `<svg x="${MG + 10}" y="${top}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}">${svg}</svg>`;
    this.y = top + h + this.fs * 1.8;
  }

  /** Raw markup at the current position (used for the sheet map). */
  raw(markup, height) {
    this.s += markup;
    this.y += height;
  }

  finish() {
    this.pages.push(this.s);
    return this.pages;
  }
}
