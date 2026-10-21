# 🧵 Sewing Pattern Printer

Turn a photo of a dress or outfit into a **print-at-home sewing pattern**.
Upload a picture, crop it to the garment, choose your size (XS–XL), and download tiled sheets you can cut, tape and sew.

**▶ Live demo: https://samhithavedaraju.github.io/sewing-pattern-printer/**

> In the demo the AI scan isn't available (it only works when the page runs as a Claude Artifact), so it traces the garment outline instead. Use **Add a garment manually** to try every feature without a photo.

## How it works
1. **Crop** the photo around the garment(s).
2. **Scan.** AI identifies each garment (dress, top, skirt, pants, shorts) and details such as sleeves, length, neckline and fit.
3. **Shape tracing.** The garment's outline is measured (waist narrowing, skirt/leg flare) so the pattern keeps the same shape as the photo.
4. **Pick a size.** XS–XL presets (or custom bust/waist/hip/height) scale the pattern. For outfits with several pieces, each piece gets its own size and you choose to print all or just one.
5. **Preview and print.** See the full pattern, then download a PDF of tiled sheets or print directly.

## Made for beginners
- **Instructions written by Claude for your photo.** When the app runs as a Claude Artifact, Claude describes the garment, lists details the basic pattern simplifies (pockets, ruffles, buttons…) with tips, then writes brand-new step-by-step instructions with its own diagrams for each scan. "Write new instructions" asks for a fresh set at any time. AI-drawn diagrams are sanitized to plain shapes and text before they're shown. The printed pattern pieces are always measured by the app, never drawn by AI.
- **How to sew it.** When AI isn't available, numbered, plain-language steps written for the exact pattern you chose: garment type, sleeves or sleeveless, neckline, zipper or elastic waist. Key steps have small diagrams (right sides together, sewing a seam, pressing, clipping curves, hemming). The steps are also printed as extra pages at the end of the PDF.
- **How to measure.** A body diagram showing where to measure bust, waist, hip and height, with short tips.
- **Find my size.** Enter your measurements to get the closest size. If your bust, waist and hip fall in different sizes, the app explains this and can switch to your own measurements, so the pattern blends between sizes. Or use one size for tops and another for bottoms.
- **Fabric calculator and cutting layout.** For 110 cm (45 in) and 150 cm (60 in) fabric, the real pattern pieces are laid out on folded fabric: fold pieces on the fold, grainlines parallel to the selvedge, sleeves and legs cut as pairs. The app adds about 10%, rounds up to the next 10 cm, and draws the layout.
- **Supplies list.** Thread, zipper length or elastic length (worked out from your waist), interfacing for facings and waistbands, bias binding, plus beginner-friendly fabric suggestions for each garment. All of this is also printed on the "Start here" page.
- **Glossary popups.** Sewing words such as seam allowance, grainline, selvedge, facing and ease are underlined. Tap one for a short definition. Works on touch screens.

## Printing and assembly
- Paper sizes: A0–A6, B4, B5, Letter, Legal, Tabloid, Executive, Half Letter.
- Print at **100% / Actual size** and check the 5 × 5 cm square.
- The "Start here" page (or pages) has assembly instructions, a page map, fabric amounts, the cutting layout and the supplies list.
- Cut off the left and top margins, overlap the next sheet onto the shaded tab, match lines and tape.
- Cut on the solid line, sew on the dashed line (1.5 cm seam allowance). Fold and grainline marks are included.
- The last pages are the step-by-step sewing instructions.

## Garments supported
| Type | Pieces generated |
|------|------------------|
| Dress | Front, back, optional sleeve |
| Top | Front, back, optional sleeve |
| Skirt | Panel (cut 2 on fold), waistband |
| Pants / Shorts | Front, back, waistband |

Skirts, pants and shorts can have a zipper or an elastic waist (Customize → Waist closure).

## Run it
Open `index.html` in a browser, or use the live demo above. It is a single self-contained file. The AI scan works when the page runs as a Claude Artifact; elsewhere it falls back to outline tracing only. PDF export loads jsPDF from cdnjs.

## Limitations
- Shape tracing works best on a plain background and may misjudge busy photos. Use the Customize panel to adjust.
- Necklines: round, V, square, boat. Fancy collars and sleeves become plain versions.
- Drafts use simple blocks with 6 cm ease. Make a test garment first.
- Neck facings are traced from the front and back pieces (the instructions explain how) rather than printed as separate pieces.
- Fabric amounts are estimates for plain fabric. Allow extra for one-way prints, nap or pattern matching.

## Roadmap
See [ROADMAP.md](ROADMAP.md) for planned features.

## Project structure
```
index.html   the whole app (HTML, CSS, JS)
docs/        screenshots
README.md    this file
ROADMAP.md   feature ideas and status
```
