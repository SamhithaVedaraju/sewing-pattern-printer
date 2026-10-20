# 🧵 Sewing Pattern Printer

Turn a photo of a dress or outfit into a **print-at-home sewing pattern**.
Upload a picture, crop it to the garment, choose your size (XS–XL), and download tiled sheets you can cut, tape and sew.

## How it works
1. **Crop** the photo around the garment(s).
2. **Scan.** AI identifies each garment (dress, top, skirt, pants, shorts) and details such as sleeves, length, neckline and fit.
3. **Shape tracing.** The garment's outline is measured (waist narrowing, skirt/leg flare) so the pattern keeps the same shape as the photo.
4. **Pick a size.** XS–XL presets (or custom bust/waist/hip/height) scale the pattern. For outfits with several pieces, each piece gets its own size and you choose to print all or just one.
5. **Preview and print.** See the full pattern, then download a PDF of tiled sheets or print directly.

## Printing and assembly
- Paper sizes: A0–A6, B4, B5, Letter, Legal, Tabloid, Executive, Half Letter.
- Print at **100% / Actual size** and check the 5 × 5 cm square.
- Sheet 1 is a "Start here" page with instructions and a page map.
- Cut off the left and top margins, overlap the next sheet onto the shaded tab, match lines and tape.
- Cut on the solid line, sew on the dashed line (1.5 cm seam allowance). Fold and grainline marks are included.

## Garments supported
| Type | Pieces generated |
|------|------------------|
| Dress | Front, back, optional sleeve |
| Top | Front, back, optional sleeve |
| Skirt | Panel (cut 2 on fold), waistband |
| Pants / Shorts | Front, back, waistband |

## Run it
Open `index.html` in a browser. It is a single self-contained file. The AI scan works when the page runs as a Claude Artifact; elsewhere it falls back to outline tracing only. PDF export loads jsPDF from cdnjs.

## Limitations
- Shape tracing works best on a plain background and may misjudge busy photos. Use the Customize panel to adjust.
- Necklines: round, V, square, boat. Fancy collars and sleeves become plain versions.
- Drafts use simple blocks with 6 cm ease. Make a test garment first.

## Project structure
```
index.html   the whole app (HTML, CSS, JS)
docs/        screenshots
README.md    this file
```
