// Home page: draws a real pattern piece in the hero, using the studio's drafting code.

import { SEAM, INK } from './core/constants.js';
import { state, newItem } from './core/state.js';
import { makePieces } from './pattern/geometry.js';
import { glossify, initGlossaryPopup } from './sewing/glossary.js';
import { initSite } from './site.js';

function drawHeroPiece() {
  const dress = newItem('dress');
  state.items = [dress];
  const front = makePieces(dress, 'DRESS')[0];
  const pad = SEAM + 30;
  const w = front.w + pad * 2;
  const h = front.h + pad * 2;
  // A 5 × 5 cm check square sits in the corner, as on every printed pattern.
  const square = `<g transform="translate(${w - pad - 55} ${pad - 10})"><rect width="50" height="50" fill="none" stroke="${INK.cut}" stroke-width="1"/><text x="25" y="28" font-size="8" text-anchor="middle" fill="${INK.cut}">5 × 5 cm</text></g>`;
  document.getElementById('hero-piece').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="A dress front pattern piece with cut line, sewing line, fold and grainline">
    <g transform="translate(${pad} ${pad})">
      <clipPath id="hero-fold"><rect x="0" y="-60" width="${front.w + 80}" height="${front.h + 120}"/></clipPath>
      <g clip-path="url(#hero-fold)">
        <path d="${front.d}" fill="none" stroke="${INK.cut}" stroke-width="${2 * SEAM + 1.2}" stroke-linejoin="round"/>
        <path d="${front.d}" fill="none" stroke="#fff" stroke-width="${2 * SEAM}" stroke-linejoin="round"/>
        <path class="hero-sew" d="${front.d}" fill="#fff" stroke="${INK.sew}" stroke-width="1.6" stroke-dasharray="7 4"/>
      </g>
      <line x1="0" y1="0" x2="0" y2="${front.h}" stroke="${INK.cut}" stroke-width="3"/>
      <text transform="translate(14 ${front.h / 2}) rotate(-90)" font-size="13" fill="${INK.cut}" text-anchor="middle" letter-spacing="2">FOLD</text>
      <line x1="${front.gx}" y1="${front.g1}" x2="${front.gx}" y2="${front.g2}" stroke="${INK.cut}" stroke-width="1.6"/>
      <path d="M${front.gx} ${front.g1}l-5 13h10zM${front.gx} ${front.g2}l-5 -13h10z" fill="${INK.cut}"/>
      <text x="${front.gx + 14}" y="${front.ty}" font-size="20" font-weight="700" fill="${INK.cut}">DRESS FRONT</text>
      <text x="${front.gx + 14}" y="${front.ty + 20}" font-size="12" fill="${INK.cut}">Cut 1 on fold · size M</text>
    </g>${square}</svg>`;
}

initSite();
initGlossaryPopup();
drawHeroPiece();
glossify(document.querySelector('.features'));
