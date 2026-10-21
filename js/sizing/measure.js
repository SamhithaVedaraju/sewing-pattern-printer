// How to measure, and which size fits best.

import { SIZES } from '../core/constants.js';

/** Body figure with the four measuring lines. Colours come from CSS (.body-fig). */
export const BODY_FIGURE = `<svg class="body-fig" viewBox="0 0 210 300" role="img" aria-label="Body figure showing where to measure bust, waist, hip and height">
<circle class="body-fig__body" cx="100" cy="30" r="16"/>
<path class="body-fig__arm" d="M68 66C60 72 58 86 56 104L50 160M132 66C140 72 142 86 144 104L150 160"/>
<path class="body-fig__body" d="M91 44V56L70 62C66 70 66 76 67 82C66 96 70 110 76 124C70 134 64 142 64 154L70 284H94L100 184L106 284H130L136 154C136 142 130 134 124 124C130 110 134 96 133 82C134 76 134 70 130 62L109 56V44Z"/>
<ellipse class="body-fig__tape" cx="100" cy="92" rx="36" ry="5"/><ellipse class="body-fig__tape" cx="100" cy="124" rx="26" ry="4"/><ellipse class="body-fig__tape" cx="100" cy="154" rx="38" ry="5"/>
<path class="body-fig__tape body-fig__tape--thin" d="M30 92H62M38 124H72M30 154H60M182 14V286M178 20L182 14L186 20M178 280L182 286L186 280M174 14H190M60 286H190"/>
<text x="2" y="96">Bust</text><text x="2" y="128">Waist</text><text x="2" y="158">Hip</text><text transform="translate(198 150) rotate(90)" text-anchor="middle">Height</text></svg>`;

export const MEASURE_TIPS = [
  'Measure over thin clothes or underwear, standing relaxed. A friend makes it easier.',
  '<strong>Bust:</strong> around the fullest part of the chest, keeping the tape level across your back.',
  '<strong>Waist:</strong> around your natural waist, the narrowest part, where you bend to the side.',
  '<strong>Hip:</strong> around the fullest part of your bottom, usually 18–22 cm below the waist.',
  '<strong>Height:</strong> barefoot with your back to a wall, from the floor to the top of your head.',
  'Keep the tape snug but not tight (one finger fits under it). Don’t add extra: the pattern already adds ease so you can move.',
];

/**
 * Closest preset size for each measurement.
 * @param m { B, W, H } in cm
 * @returns {{ bust, waist, hip, same, outside }}
 */
export function recommendSize(m) {
  const nearest = (k) => Object.keys(SIZES).reduce((a, s) => (Math.abs(SIZES[s][k] - m[k]) < Math.abs(SIZES[a][k] - m[k]) ? s : a));
  const bust = nearest('B'), waist = nearest('W'), hip = nearest('H');
  const outside = ['B', 'W', 'H'].some((k) => m[k] < SIZES.XS[k] - 4 || m[k] > SIZES.XL[k] + 4);
  return { bust, waist, hip, same: bust === waist && waist === hip, outside };
}
