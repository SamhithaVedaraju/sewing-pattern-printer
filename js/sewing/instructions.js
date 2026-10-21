// Standard sewing steps, used when Claude isn't available, and the five built-in diagrams.

import { isBodice } from '../core/constants.js';
import { DIAGRAMS } from './diagrams.js';

/** Small technique diagrams, drawn in a 120 × 62 box. */
export const FIGURES = {
  rst: {
    title: 'Right sides together',
    svg: `<rect x="20" y="12" width="82" height="34" rx="2" fill="#f4c6d6" stroke="#b5446e"/><rect x="30" y="5" width="72" height="34" rx="2" fill="#f7f7f7" stroke="#666"/><text x="22" y="44.5" font-size="4.5" fill="#7a2848">right side</text><text x="36" y="14" font-size="5.5" fill="#555">wrong side up</text><path d="M110 12h-14M110 22h-14M110 32h-14" stroke="#666" stroke-width=".8"/><circle cx="111" cy="12" r="1.6"/><circle cx="111" cy="22" r="1.6"/><circle cx="111" cy="32" r="1.6"/><text x="60" y="58" font-size="5.5" text-anchor="middle" font-weight="700">Right sides together, pinned at the edge</text>`,
  },
  seam: {
    title: 'Sewing a seam',
    svg: `<rect x="8" y="10" width="94" height="34" fill="#f4c6d6" stroke="#b5446e"/><rect x="8" y="6" width="94" height="34" fill="#f7f7f7" stroke="#666"/><line x1="87" y1="6" x2="87" y2="40" stroke="#b5446e" stroke-width="1.6" stroke-dasharray="4 2"/><path d="M87 48h15M87 46v4M102 46v4" stroke="#333" stroke-width=".6"/><text x="94.5" y="54.5" font-size="4.5" text-anchor="middle">1.5 cm</text><path d="M74 12v18" stroke="#b5446e" stroke-width="1.2"/><path d="M71 28l3 5 3-5z" fill="#b5446e"/><text x="40" y="25" font-size="5.5" fill="#555" text-anchor="middle">wrong side</text><text x="50" y="61" font-size="5.5" text-anchor="middle" font-weight="700">Sew 1.5 cm from the edge</text>`,
  },
  press: {
    title: 'Pressing a seam open',
    svg: `<path d="M45 6h30l7 10H38z" fill="#ddd" stroke="#888"/><path d="M50 6V2h20v4" fill="none" stroke="#888"/><path d="M6 28H59V36H40" fill="none" stroke="#b5446e" stroke-width="2"/><path d="M114 28H61V36H80" fill="none" stroke="#666" stroke-width="2"/><circle cx="60" cy="28" r="1.4" fill="#222"/><text x="20" y="24" font-size="5" fill="#7a2848">right side</text><text x="60" y="46" font-size="5" text-anchor="middle" fill="#555">seam allowances pressed apart</text><text x="60" y="59" font-size="5.5" text-anchor="middle" font-weight="700">Press the seam open</text>`,
  },
  clip: {
    title: 'Clipping a curve',
    svg: `<path d="M10 50Q60 0 110 50Z" fill="#f4c6d6" stroke="#b5446e"/><path d="M18 50Q60 12 102 50" fill="none" stroke="#b5446e" stroke-dasharray="3 2"/><path d="M30 34L33.6 36.9M45 27.3L46.8 31.3M60 25V29.5M75 27.3L73.2 31.3M90 34L86.4 36.9" stroke="#222"/><text x="60" y="45" font-size="4.5" text-anchor="middle" fill="#7a2848">snip close to the stitches</text><text x="60" y="59" font-size="5.5" text-anchor="middle" font-weight="700">Clip the curve</text>`,
  },
  hem: {
    title: 'A double-fold hem',
    svg: `<path d="M40 4V50a3 3 0 0 0 6 0V24a1.5 1.5 0 0 0-3 0V31" fill="none" stroke="#b5446e" stroke-width="1.6"/><path d="M36 28h14" stroke="#222" stroke-dasharray="1.5 1"/><path d="M53 24v29M51 24h4M51 53h4" stroke="#333" stroke-width=".5"/><text x="57" y="29" font-size="4.5">0.5 cm turned under</text><text x="57" y="45" font-size="4.5">1 cm hem</text><text x="34" y="12" font-size="4.5" text-anchor="end">outside</text><text x="50" y="12" font-size="4.5">inside (wrong side)</text><text x="60" y="61" font-size="5.5" text-anchor="middle" font-weight="700">Double-fold hem, stitched</text>`,
  },
};

/**
 * A step's picture as { svg, vw, vh }, or null.
 * `fig` is a technique key (FIGURES), a garment diagram key (drawn from this garment's
 * own pieces), or { svg } drawn by Claude in a 120 × 70 box.
 * @param ctx { pieces, item } for garment diagrams
 */
export function figureOf(fig, ctx) {
  if (!fig) return null;
  if (typeof fig === 'string') {
    if (FIGURES[fig]) return { svg: FIGURES[fig].svg, vw: 120, vh: 62 };
    const draw = DIAGRAMS[fig];
    if (!draw || !ctx) return null;
    try { return draw(ctx); } catch { return null; }
  }
  return fig.svg ? { svg: fig.svg, vw: 120, vh: 70 } : null;
}

const NECK_NAMES = { round: 'round neckline', v: 'V neckline', square: 'square neckline', boat: 'boat neckline' };

/**
 * Standard beginner steps for one garment, chosen from its options.
 * @returns {Array<[string, string|null]>} [step text, figure key]
 */
export function standardSteps(item, info) {
  const t = item.type;
  const bodice = isBodice(t);
  const sleeves = bodice && item.sleeves !== 'none';
  const elastic = !bodice && item.close === 'elastic';
  const z = info.zip;
  const steps = [];
  const step = (text, fig = null) => steps.push([text, fig]);

  step('Wash, dry and iron your fabric before cutting, so the finished garment won’t shrink later.');
  step('Fold the fabric in half lengthwise, right sides together, with the selvedges lined up. Lay each pattern piece with its grainline arrow parallel to the selvedge and any edge marked FOLD exactly on the fold. Pin and cut along the solid line.', 'cut');
  step('Practise on a scrap first. Every seam is sewn 1.5 cm from the cut edge: this is the seam allowance, and it is already included in the pattern.', 'seam');

  if (bodice) {
    step('Make the neck facings: lay the front pattern on paper, trace the neckline and the first 5 cm of the shoulder, then draw a line 6 cm below the neckline, following its curve. Repeat for the back. Cut each facing once on the fold from fabric and once from fusible interfacing, and iron the interfacing to the wrong side.', 'facing');
    step('Sew the shoulder seams: lay the front and back right sides together, line up the shoulders, pin and sew.', 'shoulders');
    step('Finish the raw edges of each seam with a zigzag stitch (or pinking shears), then press the seam open. Do this after every seam from now on.', 'press');
    step('Sew the facing shoulder seams the same way and press them open. Zigzag the outer edge of the facing.');
    if (t === 'top') step('Make room for your head: on the back neckline, draw a 10 cm line straight down from the centre back (the fold line). You will open it up in the next step.');
    step(`Pin the facing to the neckline, right sides together, with the shoulder seams matching. Sew around the ${NECK_NAMES[item.neck]}${t === 'top' ? ', then down both sides of the 10 cm line, 5 mm away from it, meeting in a point. Cut along the line almost to the point' : ''}.`);
    step(`Trim the seam allowance to about 6 mm and clip into the curve every 1–2 cm${item.neck === 'v' ? ', snipping right into the V point' : item.neck === 'square' ? ', snipping diagonally into each corner' : ''}. Don’t cut through the stitches.`, 'neckline');
    step('Turn the facing to the inside and press. Stitch through the facing and the seam allowances 3 mm from the seam (understitching) so the facing stays inside, then tack it to the shoulder seams by hand.');
    if (sleeves) step('Set in each sleeve while the side seams are still open: pin the sleeve cap to the armhole, right sides together, with the top of the cap at the shoulder seam. The cap is a little longer than the armhole; this ease gives you room to move. Spread it evenly with plenty of pins and sew with the sleeve on top.', 'sleeve');
    const sleeveRun = sleeves ? ' and sleeve seam in one go, from the sleeve hem to the garment hem' : '';
    if (t === 'dress') {
      step(`Sew the right side seam${sleeveRun}, right sides together. On the left side, leave a ${z} cm opening for the zipper starting 3 cm below the armhole, and sew the seam above and below it.`, 'sides');
      step(`Insert the ${z} cm invisible zipper in the left side opening, following the instructions on the zipper packet (a zipper foot helps).`);
    } else {
      step(`Sew the side seams${sleeves ? ' and sleeve seams in one go, from the sleeve hem to the garment hem' : ''}, right sides together.`, 'sides');
    }
    if (!sleeves) step('Finish the armholes with bias binding: unfold one edge of the binding, pin it to the armhole right sides together and sew along its fold line. Trim and clip the curve, turn the binding to the inside, press and stitch it down.', 'armhole');
    else step('Hem the sleeves: press 0.5 cm, then another 1 cm, to the wrong side and stitch close to the inner fold.', 'sleevehem');
    if (t === 'top') step('Sew a small button at the top of the back opening and a thread loop on the other side.');
  } else {
    if (!elastic) step('Iron fusible interfacing to the wrong side of one long half of the waistband.');
    if (t !== 'skirt') {
      step(`Make each leg: lay a front and a back right sides together. Sew the inside leg seam (the short seam from the crotch to the hem), then the outside side seam${elastic ? '' : `. On the left leg, leave the top ${z} cm of the side seam open for the zipper`}.`, 'legs');
      step('Finish the raw edges with a zigzag stitch (or pinking shears) and press the seams open.', 'press');
      step('Turn one leg right side out and slip it inside the other, so they are right sides together. Match the inside leg seams and pin the curved crotch seam from the front waist to the back waist. Sew it, then sew again over the curve for strength.', 'crotch');
      step(`Clip the curve of the crotch seam so it lies flat, then turn the ${t} right side out.`, 'clip');
    } else {
      step(elastic
        ? 'Lay the two skirt panels right sides together and sew both side seams.'
        : `Lay the two skirt panels right sides together. Sew the right side seam, and the left side seam from ${z} cm below the waist down to the hem.`, 'sides');
      step('Finish the raw edges with a zigzag stitch (or pinking shears) and press the seams open.', 'press');
    }
    if (elastic) {
      step('Sew the short ends of the waistband right sides together to make a loop. Fold it in half lengthwise, wrong sides together, and press.');
      step(`Pin the waistband’s raw edges to the waist, right sides together, matching the band seam to a side seam. Sew all round, leaving a 5 cm gap. Thread ${info.elastic} cm of 2.5 cm elastic through the gap with a safety pin, overlap the ends by 2.5 cm and zigzag them together, then sew the gap closed. Spread the gathers evenly.`, 'waistband');
    } else {
      step(`Insert the ${z} cm invisible zipper in the opening at the top of the left side seam, following the instructions on the zipper packet (a zipper foot helps).`);
      step('Press the waistband in half lengthwise, wrong sides together, then open it out. Pin the interfaced long edge to the waist, right sides together, with 1.5 cm extending at the front end of the zipper and 3 cm at the back end for an overlap. Sew.', 'waistband');
      step('Fold the waistband right sides together along the pressed line, sew across both short ends, trim the corners and turn it right side out. Fold under the free long edge, pin it over the seam on the inside, and stitch it down from the outside, right in the seam line. Sew a hook and eye on the overlap.');
    }
  }
  const flared = (t === 'dress' || t === 'skirt') && item.flare > 150;
  step(`Try it on. Hem the ${t === 'pants' || t === 'shorts' ? 'legs' : t}: press 0.5 cm, then another 1 cm, to the wrong side and stitch close to the inner fold.${flared ? ' Let a flared skirt hang overnight before you hem it, so the fabric can settle.' : ''}`, 'hemline');
  step('Give everything a final press. Well done, you made it!');
  return steps;
}
