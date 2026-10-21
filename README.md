# Pattern Printer

Turn a photo of a garment into a **print-at-home sewing pattern**, with step-by-step instructions, a fabric layout, a supplies list and help with sizing. Made for people who are new to sewing.

**▶ Live site: https://samhithavedaraju.github.io/sewing-pattern-printer/**

## The site

| Page | What it's for |
|------|---------------|
| **Home** (`index.html`) | What Pattern Printer does and how it works. The hero shows a real pattern piece drafted live in the browser. |
| **Make a pattern** (`studio.html`) | The studio: upload a photo, check the garments and size, then view the pattern, sewing steps, fabric plan and print sheets in tabs. Opens on an example dress so you can see everything first. |
| **Learn** (`learn.html`) | How to measure, the size chart, five beginner techniques with diagrams, choosing fabric, printing and taping, and a glossary. |

## What the studio does

1. **Crop** the photo around the garment(s).
2. **Recognise the garments.** Claude names each one (dress, top, skirt, pants, shorts) with its sleeves, neckline, length and fit, describes it, and notes details the basic pattern simplifies (pockets, ruffles, buttons…) with tips.
3. **Trace the shape.** The garment's outline sets waist shaping and skirt or leg flare.
4. **Pick a size.** XS–XL, or your own bust, waist, hip and height. "Find my size" recommends a size and grades between sizes when your measurements differ.
5. **Get the pattern:**
   - **Pattern** tab: the full-size layout, optionally split into sheets.
   - **How to sew** tab: Claude writes brand-new steps and diagrams for every photo. "Write new instructions" asks for a fresh set at any time. Standard steps are used when AI isn't available.
   - **Fabric & supplies** tab: the real pieces laid out on folded 110 cm and 150 cm fabric, the amount to buy, a supplies list and fabric suggestions.
   - **Print & download** tab: a PDF for any of 14 paper sizes, with a "Start here" page, tiled pattern sheets and the sewing steps.

Sewing words such as seam allowance, selvedge and facing are underlined everywhere. Tap one for a definition.

### About the AI

Garment recognition and photo-specific instructions use Claude, so they work when the site runs as a Claude Artifact. **Claude's detail** in the studio chooses between Best (Claude's most capable model, which knows garments and dressmaking in the most depth; slower) and Faster. On GitHub Pages and other hosts the AI is off: the studio traces the outline, assumes a dress (change it under "Change the style") and shows the standard steps, and it says so clearly.

The printed pattern pieces are always drafted by the app's own geometry, never by AI, so they stay accurate to the millimetre. Diagrams drawn by Claude are sanitized to plain shapes and text before they're shown.

## Run it locally

The site is plain HTML, CSS and JavaScript modules with no build step. Browsers only load modules over `http://`, so serve the folder instead of double-clicking the file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Any static server works. GitHub Pages serves it as is.

## Project structure

```
index.html              Home page
studio.html             Pattern studio
learn.html              Sewing basics: measuring, techniques, fabric, glossary
assets/                 logo and favicon
css/
  tokens.css            colours, type and spacing (light and dark)
  base.css              reset, typography, header, footer, page frame
  components.css        buttons, fields, chips, cards, dialogs, glossary popup
  home.css, studio.css, learn.css   page layouts
  print.css             printing only the pattern sheets
js/
  core/constants.js     sizes, ease, lengths, paper sizes, seam allowance
  core/state.js         the studio's garments and size preferences
  core/dom.js           small DOM and text helpers
  pattern/geometry.js   drafting: bodice, sleeve, skirt, legs, waistband
  pattern/sheets.js     full-size layout, sheet tiling, print pages
  sewing/instructions.js  standard steps and the five technique diagrams
  sewing/fabric.js      cutting layout, fabric amounts, supplies
  sewing/glossary.js    definitions and tappable terms
  sizing/measure.js     measuring guide and size recommendation
  ai/claude.js          garment recognition and Claude-written instructions
  photo/outline.js      crop tool and outline tracing
  export/pdf.js         PDF building (jsPDF from cdnjs)
  home.js, studio.js, learn.js   one entry script per page
  site.js               shared page behaviour
ROADMAP.md              feature ideas and status
```

## Printing and assembly

- Print at **100% / Actual size** and check the 5 × 5 cm square.
- The "Start here" page has assembly steps, a sheet map, fabric amounts, the cutting layout and supplies.
- Trim the left and top margins, overlap the next sheet onto the shaded tab, match lines and tape.
- Cut on the solid line, sew on the dashed line (1.5 cm seam allowance).

## Limitations

- Shape tracing works best on a plain background.
- Necklines: round, V, square, boat. Collars, pockets and fancy sleeves become plain versions; Claude's notes explain how to add or skip them.
- Drafts use simple blocks with 4–12 cm ease. Make a test garment first.
- Neck facings are traced from the front and back pieces (the steps explain how) rather than printed separately.
- Fabric amounts are estimates for plain fabric. Allow extra for one-way prints, nap or pattern matching.

See [ROADMAP.md](ROADMAP.md) for what's planned.
