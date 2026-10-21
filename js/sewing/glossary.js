// Sewing glossary: definitions, tappable terms and the popup that explains them.

export const GLOSSARY = {
  'seam allowance': 'The strip between the cut edge and the stitching line. In this pattern it is 1.5 cm and already included.',
  grainline: 'The long arrow on each pattern piece. Lay it parallel to the selvedge so the garment hangs straight and doesn’t twist.',
  fold: 'The folded edge of the fabric. Pieces marked FOLD are placed exactly on it and cut as one symmetrical piece. Don’t cut along the fold.',
  selvedge: 'The firm, finished edges along both long sides of the fabric. They don’t fray and run with the lengthwise grain.',
  notch: 'A small mark on a pattern edge used to line pieces up, such as the top of a sleeve with the shoulder seam.',
  'right side': 'The “good” side of the fabric, the one that shows on the outside of the finished garment.',
  'wrong side': 'The back of the fabric, which ends up on the inside of the garment.',
  hem: 'The bottom edge of a garment or sleeve, folded up and stitched so it looks neat and doesn’t fray.',
  ease: 'Extra room added to your body measurements so you can move and breathe. This pattern already includes it.',
  dart: 'A folded, stitched wedge that shapes flat fabric around curves like the bust or waist.',
  facing: 'A shaped piece sewn to an edge such as the neckline, then turned inside to give a clean finish.',
  interfacing: 'A stiffening layer ironed or sewn to the wrong side of fabric to support areas like facings and waistbands.',
  waistband: 'The band sewn around the top of a skirt or trousers. It closes with a hook, button or elastic.',
};

const TERM_RE = /\b(seam allowances?|grainlines?|selvedges?|notch(?:es)?|right sides?|wrong sides?|interfacing|facings?|waistbands?|hems?|ease|darts?|the fold|on fold|fold line)\b/gi;
// Longest first, so "interfacing" never matches as "facing".
const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const keyFor = (match) => KEYS.find((k) => match.toLowerCase().includes(k));

/** Turn every glossary term inside `root` into a button that opens its definition. */
export function glossify(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.parentElement.closest('svg,button,select,label,textarea,h1,h2,h3,a')) return NodeFilter.FILTER_REJECT;
      TERM_RE.lastIndex = 0;
      return TERM_RE.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    let last = 0;
    node.data.replace(TERM_RE, (match, _g, offset) => {
      const key = keyFor(match);
      if (!key) return match;
      frag.append(node.data.slice(last, offset));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'term';
      b.dataset.term = key;
      b.textContent = match;
      b.setAttribute('aria-label', `${match}: what does this mean?`);
      frag.append(b);
      last = offset + match.length;
      return match;
    });
    frag.append(node.data.slice(last));
    node.replaceWith(frag);
  }
}

/** Create the shared definition popup and open it when a term is tapped. */
export function initGlossaryPopup() {
  const pop = document.createElement('div');
  pop.className = 'term-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-live', 'polite');
  pop.hidden = true;
  pop.innerHTML = '<button class="icon-btn term-pop__close" type="button" aria-label="Close">✕</button><div class="term-pop__body"></div>';
  document.body.append(pop);
  const body = pop.querySelector('.term-pop__body');
  const close = () => { pop.hidden = true; };

  document.addEventListener('click', (e) => {
    const term = e.target.closest('.term');
    if (term) {
      const key = term.dataset.term;
      // A modal dialog sits above the page, so the popup must live inside it to be seen.
      const host = term.closest('dialog') || document.body;
      if (pop.parentNode !== host) host.append(pop);
      body.innerHTML = `<strong>${key.charAt(0).toUpperCase() + key.slice(1)}</strong><p>${GLOSSARY[key]}</p>`;
      pop.hidden = false;
      const r = term.getBoundingClientRect();
      const h = pop.offsetHeight;
      pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
      pop.style.top = (r.bottom + h + 12 > innerHeight ? r.top - h - 6 : r.bottom + 6) + 'px';
      pop.querySelector('button').focus({ preventScroll: true });
      return;
    }
    if (!e.target.closest('.term-pop')) close();
  });
  pop.querySelector('button').addEventListener('click', close);
  addEventListener('scroll', close, true);
  addEventListener('resize', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
