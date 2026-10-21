// Claude integration. Works when the site runs as a Claude Artifact, where
// `window.claude` exists; everywhere else these functions report that AI is off.

import { LENGTHS, EASE, SLEEVES, NECKLINES, isBodice, isLegs } from '../core/constants.js';
import { state, newItem, optionKey } from '../core/state.js';
import { inRange } from '../core/dom.js';
import { applyShape } from '../photo/outline.js';
import { makePieces } from '../pattern/geometry.js';
import { diagramsFor } from '../sewing/diagrams.js';
import { FIGURES } from '../sewing/instructions.js';

/** What each diagram shows, so Claude can pick the right one for a step. */
const DIAGRAM_NOTES = {
  cut: 'every pattern piece laid out, with fold edges and grainlines',
  shoulders: 'front laid on back, right sides together, shoulder seam highlighted',
  facing: 'a 6 cm facing band traced along the neckline',
  neckline: 'the neckline seam with clips into the curve',
  sleeve: 'the sleeve cap pinned into the armhole',
  sides: 'front laid on back with the side seam highlighted (and the zipper opening, if any)',
  armhole: 'bias binding around the armhole',
  hemline: 'the hem turned up along the bottom edge',
  sleevehem: 'the sleeve hem turned up',
  waistband: 'the waistband attached along the waist edge',
  legs: 'front leg on back leg with the inside-leg and side seams highlighted',
  crotch: 'the two legs joined along the curved crotch seam',
  rst: 'close-up: two layers right sides together, pinned',
  seam: 'close-up: sewing 1.5 cm from the edge',
  press: 'close-up: pressing a seam open',
  clip: 'close-up: clipping a curved seam allowance',
  hem: 'close-up: cross-section of a double-fold hem',
};

/** Claude's ask function, or null when this page isn't running inside Claude. */
export async function getClaude() {
  try {
    return window.claude ? await window.claude.use('sample') : null;
  } catch {
    return null;
  }
}

/** Best quality uses Claude's most capable model, which knows garments and construction best. */
const tier = () => (state.aiQuality === 'best' ? 'complex' : 'default');

const REASONS = {
  not_granted: 'Claude wasn’t allowed to look at your photo. Reload the page and choose Allow when Claude asks.',
  rate_limited: 'You’ve reached your Claude usage limit for now. Try again later.',
  images_unavailable: 'This view can’t send photos to Claude.',
  sampling_disabled: 'Claude isn’t available for this account.',
  session_expired: 'Please sign in to Claude again.',
  image_rejected: 'Claude couldn’t read that photo. Try a JPEG or PNG.',
  refused: 'Claude declined this photo. Try another one.',
};
/** A plain-language reason for a failed Claude call. */
export const explain = (e) => REASONS[e && e.code] || `Something went wrong (${(e && e.code) || 'error'}). Try again.`;

const IDENTIFY_PROMPT = `You are an experienced pattern cutter and dressmaker. The image shows an outfit. List every distinct garment that can be patterned, each as one of: dress, top, skirt, pants, shorts (shirts, tees, blouses, jackets and sweaters count as "top"; a jumpsuit is "top" plus "pants"). Return ONLY JSON: {"items":[{"type":"dress|top|skirt|pants|shorts","sleeves":"none|short|long","length":"dress/skirt: mini|knee|midi|maxi; top: crop|regular|tunic; pants: cropped|full; shorts: short|knee","fit":"fitted|regular|loose","neckline":"round|v|square|boat","box":[x0,y0,x1,y1],"waistY":number,"hipY":number,"flare":number,"waist":number,"summary":string,"details":[string],"tips":[string]}]}. box is that garment's tight bounding box as fractions 0-1 of image width and height (top of garment to hem). waistY and hipY are the fractions 0-1 of the garment's height (from its top) at the narrowest waist and widest hip. flare is 100-210: hem width / hip width x100 for dress or skirt; for pants or shorts the combined hem width of both legs / hip width x100 between 50 and 150. waist is 0-100: 0 for boxy and 100 for strongly fitted at the waist. Omit sleeves and neckline for skirt, pants and shorts. summary is one plain sentence describing this exact garment as seen (colour, fabric look, style, silhouette). details lists up to 5 short visible construction features that a basic pattern of this type would leave out or simplify (for example ruffled hem, patch pockets, button front, collar, puff sleeves, tie belt, gathered waist, princess seams, lace trim); use [] if there are none. tips is 2 to 5 short, friendly sewing tips for a beginner making THIS garment: how to recreate or simply skip each detail, a fabric that matches what you see, and anything to watch out for. Each tip is one or two sentences.`;

const strings = (a, max, chars) => (Array.isArray(a) ? a : [])
  .filter((s) => typeof s === 'string' && s.trim()).slice(0, max).map((s) => s.trim().slice(0, chars));

/**
 * Ask Claude what garments are in the photo.
 * @returns {Promise<Array>} garments (empty if none recognised); throws a Claude error on failure
 */
export async function identifyGarments(claude, blob, mask) {
  const reply = await claude.json(IDENTIFY_PROMPT, { images: [blob], modelTier: tier() });
  return (reply?.items || []).filter((x) => x && LENGTHS[x.type]).slice(0, 5).map((x) => {
    const item = newItem(x.type);
    const bodice = isBodice(x.type);
    if (LENGTHS[x.type][x.length] != null) item.length = x.length;
    if (EASE[x.fit]) item.fit = x.fit;
    if (bodice && SLEEVES.includes(x.sleeves)) item.sleeves = x.sleeves;
    if (bodice && NECKLINES.includes(x.neckline)) item.neck = x.neckline;
    const legs = isLegs(x.type);
    item.flare = Math.round(inRange(x.flare, legs ? 50 : 100, legs ? 150 : 210, item.flare));
    item.waist = Math.round(inRange(x.waist, 0, 100, item.waist));
    const box = Array.isArray(x.box) && x.box.length === 4 && x.box[2] > x.box[0] && x.box[3] > x.box[1] ? x.box.map(Number) : [0, 0, 1, 1];
    const traced = applyShape(item, mask, box, inRange(x.waistY, 0.1, 0.9, 0.42), inRange(x.hipY, 0.1, 1, 0.6));
    item.box = box;
    item.ai = {
      summary: typeof x.summary === 'string' ? x.summary.trim().slice(0, 240) : '',
      details: strings(x.details, 5, 80),
      tips: strings(x.tips, 5, 320),
    };
    item.desc = `${item.type} · ${item.length}${bodice && item.sleeves !== 'none' ? ' · ' + item.sleeves + ' sleeves' : ''}${bodice ? ' · ' + item.neck + ' neck' : ''} · ${traced ? 'shape traced from your photo' : 'shape estimated'}`;
    return item;
  });
}

// ---- Claude-drawn diagrams are untrusted: keep only plain shapes, text and styling attributes.
const SVG_ELEMENTS = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan']);
const SVG_ATTRS = /^(d|x|y|dx|dy|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|points|fill|stroke|stroke-width|stroke-dasharray|stroke-linecap|stroke-linejoin|opacity|fill-opacity|stroke-opacity|transform|font-size|font-weight|font-style|text-anchor|dominant-baseline)$/;

export function cleanSvg(markup) {
  if (typeof markup !== 'string' || !markup.trim() || markup.length > 30000) return '';
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${markup.replace(/<\/?svg[^>]*>/gi, '')}</svg>`, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return '';
  const walk = (el) => [...el.children].forEach((child) => {
    if (!SVG_ELEMENTS.has(child.localName)) return child.remove();
    [...child.attributes].forEach((a) => {
      if (!SVG_ATTRS.test(a.name) || /url\(|script|expression/i.test(a.value)) child.removeAttribute(a.name);
    });
    walk(child);
  });
  walk(root);
  if (!root.children.length) return '';
  return new XMLSerializer().serializeToString(root).replace(/^<svg[^>]*>|<\/svg>$/g, '');
}

/** What the person will sew with, in words, for the instruction prompt. */
function notionsFor(item, info) {
  if (isBodice(item.type)) {
    return (item.type === 'dress' ? `${info.zip} cm invisible zipper in the left side seam` : 'button and loop at a back-neck slit')
      + (item.sleeves === 'none' ? ', bias binding for the armholes' : '')
      + ', interfaced neck facings traced from the front and back pieces';
  }
  return item.close === 'elastic'
    ? `${info.elastic} cm of 2.5 cm elastic in the waistband casing`
    : `${info.zip} cm invisible zipper in the left side seam, interfaced waistband, hook and eye`;
}

/**
 * Ask Claude for a brand-new set of steps and diagrams for one garment.
 * Never cached, so every call writes fresh instructions. Updates item.aiSteps / item.aiState.
 */
export async function writeInstructions(item, onChange) {
  const claude = await getClaude();
  if (!claude) return;
  const bodice = isBodice(item.type);
  const pieces = makePieces(item, item.type.toUpperCase());
  const ai = item.ai || {};
  const figures = [...diagramsFor(item), ...Object.keys(FIGURES)];
  const photoNote = state.photo
    ? ` The photo shows the original garment${item.box ? ` (inside the box ${item.box.map((v) => v.toFixed(2)).join(', ')} given as fractions of the image)` : ''}; refer to what you see in it where that helps.`
    : '';
  const prompt = `You are a patient, expert dressmaking teacher. Write fresh, beginner-friendly, step-by-step instructions for sewing the garment below from a printed paper pattern.${photoNote}
Garment: ${ai.summary || item.type}. Type ${item.type}, length ${item.length}, fit ${item.fit}${bodice ? `, sleeves ${item.sleeves}, ${item.neck} neckline` : `, ${item.close} waist`}, size ${item.size}.
Pattern pieces the person has (1.5 cm seam allowance and 1.5 cm hem allowance are already included on every edge): ${pieces.map((c) => c.n.toLowerCase() + ' (' + c.note + ')').join('; ')}.
Closure and notions: ${notionsFor(item, pieces.info)}.
Details seen in the photo that the basic pattern leaves out: ${ai.details && ai.details.length ? ai.details.join(', ') : 'none noted'}.
Rules: 10 to 16 steps in order, from preparing the fabric to the final press. Plain, friendly words for a first-time sewist. Use only the pieces listed; for any extra detail from the photo, say how to add it simply or that it can be skipped. All measurements in cm.
Pictures: the app draws diagrams from this garment's real pattern pieces. For each step where a picture helps, set "figure" to the one that shows that step best:
${figures.map((f) => `- ${f}: ${DIAGRAM_NOTES[f]}`).join('\n')}
Use each garment diagram for the step it describes and put it on the step where that seam is sewn. Leave "figure" empty when no picture helps. Only if a step really needs a picture none of these show (for example a detail from the photo such as a pocket or a ruffle), add "svg": the inner elements of an <svg viewBox="0 0 120 70"> using path, rect, circle, ellipse, line, polyline, polygon, text and g only (no <svg> tag, scripts, images, CSS or links; right side of fabric fill #f4c6d6 stroke #b5446e, wrong side fill #f7f7f7 stroke #666, stitching stroke #b5446e dasharray "3 2", labels font-size 5-6 fill #222).
Return ONLY JSON: {"steps":[{"text":"step text","figure":"one of the names above or empty","svg":"only when needed, otherwise empty"}]}`;

  item.aiState = 'busy';
  onChange();
  try {
    const reply = await claude.json(prompt, { ...(state.photo ? { images: [state.photo] } : {}), cache: false, modelTier: tier() });
    const steps = (reply && Array.isArray(reply.steps) ? reply.steps : [])
      .filter((s) => s && typeof s.text === 'string' && s.text.trim())
      .slice(0, 20)
      .map((s) => {
        const text = s.text.trim().slice(0, 800);
        if (typeof s.figure === 'string' && figures.includes(s.figure)) return [text, s.figure];
        const svg = cleanSvg(s.svg);
        return [text, svg ? { svg } : null];
      });
    if (steps.length < 4) throw { code: 'empty_completion' };
    item.aiSteps = { key: optionKey(item), steps };
    item.aiState = '';
  } catch (e) {
    item.aiState = explain(e);
  }
  if (state.items.includes(item)) onChange();
}
