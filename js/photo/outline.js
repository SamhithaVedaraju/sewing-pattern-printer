// Photo cropping and outline tracing. The outline gives the pattern its shape:
// how much the waist narrows and how far the skirt or legs flare.

import { isBodice, isLegs } from '../core/constants.js';

/** A canvas where the user drags a rectangle around the garment. */
export class CropTool {
  constructor(canvas, onReady) {
    this.canvas = canvas;
    this.image = null;
    this.crop = null;
    this.drag = null;
    this.onReady = onReady;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.image) return;
      this.drag = this.point(e);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const p = this.point(e);
      const d = this.drag;
      this.crop = [Math.min(d[0], p[0]), Math.min(d[1], p[1]), Math.max(d[0], p[0]), Math.max(d[1], p[1])];
      this.draw();
    });
    canvas.addEventListener('pointerup', () => { this.drag = null; });
  }

  load(file) {
    const img = new Image();
    img.onload = () => this.setImage(img);
    img.src = URL.createObjectURL(file);
  }

  setImage(img) {
    this.image = img;
    const k = Math.min(1, 640 / img.width);
    this.canvas.width = Math.round(img.width * k);
    this.canvas.height = Math.round(img.height * k);
    this.crop = null;
    this.draw();
    this.onReady?.();
  }

  point(e) {
    const r = this.canvas.getBoundingClientRect();
    const { width: w, height: h } = this.canvas;
    return [
      Math.max(0, Math.min(w, ((e.clientX - r.left) * w) / r.width)),
      Math.max(0, Math.min(h, ((e.clientY - r.top) * h) / r.height)),
    ];
  }

  draw() {
    const { canvas: cv, image, crop } = this;
    const x = cv.getContext('2d');
    x.drawImage(image, 0, 0, cv.width, cv.height);
    if (!crop) return;
    const [a, b, c, d] = crop;
    x.fillStyle = 'rgba(0,0,0,.5)';
    x.fillRect(0, 0, cv.width, b);
    x.fillRect(0, d, cv.width, cv.height - d);
    x.fillRect(0, b, a, d - b);
    x.fillRect(c, b, cv.width - c, d - b);
    x.strokeStyle = '#fff';
    x.lineWidth = 2;
    x.strokeRect(a, b, c - a, d - b);
  }

  /** The cropped area (or the whole photo) as a canvas, at most 1024 px. */
  cropped(whole) {
    const { canvas: cv, image, crop } = this;
    const k = image.width / cv.width;
    const useCrop = !whole && crop && crop[2] - crop[0] > 20 && crop[3] - crop[1] > 20;
    const [a, b, c, d] = useCrop ? crop : [0, 0, cv.width, cv.height];
    const sw = (c - a) * k, sh = (d - b) * k;
    const s = Math.min(1, 1024 / Math.max(sw, sh));
    const out = document.createElement('canvas');
    out.width = Math.round(sw * s);
    out.height = Math.round(sh * s);
    out.getContext('2d').drawImage(image, a * k, b * k, sw, sh, 0, 0, out.width, out.height);
    return out;
  }
}

/** Foreground mask: pixels that differ clearly from the border (background) colour. */
export function maskOf(canvas) {
  const k = Math.min(1, 200 / canvas.width);
  const w = Math.max(1, Math.round(canvas.width * k));
  const h = Math.max(1, Math.round(canvas.height * k));
  const t = document.createElement('canvas');
  t.width = w;
  t.height = h;
  const x = t.getContext('2d');
  x.drawImage(canvas, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const bg = [0, 1, 2].map((ch) => {
    const v = [];
    for (let i = 0; i < w; i++) v.push(d[i * 4 + ch], d[((h - 1) * w + i) * 4 + ch]);
    for (let j = 0; j < h; j++) v.push(d[j * w * 4 + ch], d[(j * w + w - 1) * 4 + ch]);
    return v.sort((a, b) => a - b)[v.length >> 1];
  });
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = Math.hypot(d[i * 4] - bg[0], d[i * 4 + 1] - bg[1], d[i * 4 + 2] - bg[2]) > 45 ? 1 : 0;
  }
  return { mask, w, h };
}

/** Garment width at three heights (fractions of the box): waist, hip, hem. */
function widths(m, box, at) {
  const X0 = Math.floor(box[0] * m.w), X1 = Math.ceil(box[2] * m.w);
  const Y0 = box[1] * m.h, H = (box[3] - box[1]) * m.h;
  const widthAt = (q) => {
    const rows = [];
    for (let y = Math.round(Y0 + (q - 0.03) * H); y <= Math.round(Y0 + (q + 0.03) * H); y++) {
      if (y < 0 || y >= m.h) continue;
      let l = -1, r = -1;
      for (let x = X0; x < X1 && x < m.w; x++) if (m.mask[y * m.w + x]) { if (l < 0) l = x; r = x; }
      if (l >= 0) rows.push(r - l);
    }
    return rows.sort((a, b) => a - b)[rows.length >> 1] || 0;
  };
  return { waist: widthAt(at[0]), hip: widthAt(at[1]), hem: widthAt(at[2]) };
}

/** Set waist shaping and flare on a garment from its traced outline. Returns false if unreadable. */
export function applyShape(item, mask, box, waistY, hipY) {
  const w = widths(mask, box, [waistY, hipY, 0.95]);
  if (w.hip < 10 || w.waist < 5) return false;
  const ratio = Math.min(1.05, Math.max(0.55, w.waist / w.hip));
  const hem = w.hem / w.hip;
  if (isBodice(item.type)) item.waist = Math.round(Math.min(1, Math.max(0, (1 - ratio) / 0.4)) * 100);
  if (item.type === 'dress' || item.type === 'skirt') item.flare = Math.round(Math.min(2.1, Math.max(1, hem)) * 100);
  if (isLegs(item.type)) item.flare = Math.round(Math.min(1.5, Math.max(0.5, hem)) * 100);
  return true;
}
