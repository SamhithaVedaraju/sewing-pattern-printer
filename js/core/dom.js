// Small DOM and text helpers shared by every page.

export const $ = (id) => document.getElementById(id);

/** Escape text for safe use inside HTML or SVG markup. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Capitalise the first letter. */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Split text into lines of at most `max` characters, breaking on spaces. */
export function wrapText(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  lines.push(line);
  return lines;
}

/** Length of an SVG path, measured by the browser. */
export function pathLength(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p.getTotalLength();
}

/** Clamp a number into a range, or fall back when it is missing or out of range. */
export const inRange = (v, lo, hi, fallback) => (+v >= lo && +v <= hi ? +v : fallback);
