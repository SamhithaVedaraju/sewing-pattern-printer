// Behaviour shared by every page.

/** Open links to other sites in a new tab. */
export function initSite() {
  document.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
}
