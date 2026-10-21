// Shared measurements and option tables. All pattern units are millimetres.

/** Seam allowance added around every piece (mm). */
export const SEAM = 15;
/** Margin around the full pattern layout (mm). */
export const LAYOUT_MARGIN = 25;
/** Printer margin on every sheet (mm). */
export const SHEET_MARGIN = 8;
/** Overlap tab between neighbouring sheets (mm). */
export const SHEET_OVERLAP = 10;

/** Paper sizes in mm, portrait [width, height]. */
export const PAPERS = {
  A4: [210, 297], A3: [297, 420], A5: [148, 210], A6: [105, 148], A2: [420, 594],
  A1: [594, 841], A0: [841, 1189], B4: [250, 353], B5: [176, 250],
  Letter: [215.9, 279.4], Legal: [215.9, 355.6], Tabloid: [279.4, 431.8],
  Executive: [184.2, 266.7], 'Half Letter': [139.7, 215.9],
};

/** Body measurements in cm for each preset size: bust, waist, hip, height. */
export const SIZES = {
  XS: { B: 80, W: 62, H: 86, ht: 160 },
  S: { B: 84, W: 66, H: 90, ht: 163 },
  M: { B: 88, W: 70, H: 94, ht: 165 },
  L: { B: 94, W: 76, H: 100, ht: 168 },
  XL: { B: 100, W: 82, H: 106, ht: 170 },
};

/** Ease added to bust and hip for each fit (cm). */
export const EASE = { fitted: 4, regular: 6, loose: 12 };

/** Length options per garment, with the value each one feeds into the draft. */
export const LENGTHS = {
  dress: { mini: 80, knee: 100, midi: 120, maxi: 145 },
  skirt: { mini: 40, knee: 58, midi: 75, maxi: 95 },
  top: { crop: -1, regular: 0, tunic: 1 },
  pants: { cropped: 0.8, full: 1 },
  shorts: { short: 0.5, knee: 1 },
};

/** Default [length, flare %] for a new garment. */
export const DEFAULTS = {
  dress: ['knee', 120], skirt: ['knee', 130], top: ['regular', 100],
  pants: ['full', 95], shorts: ['short', 105],
};

export const GARMENTS = Object.keys(LENGTHS);
export const SLEEVES = ['none', 'short', 'long'];
export const NECKLINES = ['round', 'v', 'square', 'boat'];
export const CLOSURES = ['zipper', 'elastic'];

/** Dresses and tops are drafted as bodices; the rest hang from a waistband. */
export const isBodice = (type) => type === 'dress' || type === 'top';
export const isLegs = (type) => type === 'pants' || type === 'shorts';

/** Pattern-line colours. Printed sheets stay on white paper in every theme. */
export const INK = { cut: '#222', sew: '#b5446e', soft: '#f4c6d6', pale: '#f4e3ea', muted: '#555' };
