// Builds the downloadable PDF. jsPDF is loaded as a global from cdnjs on the studio page.

/** Render one page SVG to a JPEG data URL at print resolution. */
function rasterize(svg, [PW, PH]) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const k = Math.min(5.9, 3000 / Math.max(PW, PH));
      const c = document.createElement('canvas');
      c.width = Math.round(PW * k);
      c.height = Math.round(PH * k);
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Build a PDF from page SVGs. */
export async function buildPdf(pages, paper, onProgress) {
  const [PW, PH] = paper;
  const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: [PW, PH], orientation: 'p' });
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const img = await rasterize(pages[i], paper);
    if (i) pdf.addPage([PW, PH], 'p');
    pdf.addImage(img, 'JPEG', 0, 0, PW, PH);
  }
  return pdf;
}

/** Save the PDF: through Claude's download prompt inside Claude, a normal download elsewhere. */
export async function savePdf(pdf, filename) {
  const downloads = window.claude ? await window.claude.use('downloads') : null;
  if (downloads) await downloads.save({ filename, data: pdf.output('blob') });
  else pdf.save(filename);
}
