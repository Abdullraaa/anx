# ANX Logistics — Brand Identity Process Documentation

This documents the actual decision-making process behind the ANX brand identity: what was tried, what was cut, why, and what was ultimately locked. It's a working record, not a polished brand book — the polished usage guide is a separate, later deliverable once everything below is fully applied and confirmed.

---

## 1. Starting Point & Palette

The palette was not invented in this process — it was already decided and applied to a uniform reference (polo, rider jacket, cap) before branding work began here:

- **Navy** `#0A1F44`
- **Safety Orange** `#FF7A00`
- **White** `#FFFFFF`

**Note on an earlier inconsistency:** prior funding/pitch documents had used a muted "Rust" tone, not this Safety Orange. This was flagged as a real risk (two different brand colors circulating), but resolved as low-priority once confirmed those documents hadn't been reviewed by their intended recipient yet. Going forward, Safety Orange `#FF7A00` is the single source of truth — Rust is retired.

**Green was considered and cut.** It was raised early as an instinct-based option, not a strategic one. Reasons it was dropped:
- The Navy/Orange palette was already physically applied to real uniform pieces — reopening it would mean re-litigating a decision that was already operational.
- Safety Orange carries a functional argument (road visibility for riders) that generic green doesn't.
- Green is heavily saturated in the courier/delivery category already; Navy/Orange is more differentiated.

---

## 2. Logo Exploration — Round 1 (Four Directions)

Four broad logo directions were proposed and mocked up:

1. **Wordmark-only** ("ANX" in type, no icon) — cut as a primary direction: gives no standalone app-icon/favicon asset.
2. **Wordmark + geometric mark** (chevron built into letterform) — recommended starting direction, most practical for both docs and app icon needs.
3. **Monogram/lettermark as icon** (standalone "X" as a bold geometric shape) — carried forward for deeper exploration.
4. **Route/pin motif** (dispatch/logistics visual metaphor) — carried forward for deeper exploration, flagged as more literal/generic risk.

Direction 1 (wordmark-only) was set aside early. Directions 3 and 4 became the two threads pursued for the rest of the process.

---

## 3. X Monogram Exploration (Direction 3)

Multiple angular-split X constructions were tested — two overlapping chevron/triangle shapes forming an X through negative space (distinct from a simple thick crossbar X).

**Variants tried and cut:**
- **3b (bold crossbar, offset stripes)** — cut: busy/less legible at small sizes.
- **3c (rounded-bar X)** — initially favored for legibility, later superseded once the angular-split direction (3a) was refined further.
- **3d (thicker pill X)** — a strong candidate at the time, later set aside in favor of 3a once 3a's stance was widened.
- **3e (thin elongated X)** — cut: too delicate, disappears at small sizes.
- **3f (mono-orange tonal, one half at reduced opacity)** — cut on two grounds: doesn't reproduce reliably in print/embroidery, and reads as a rendering error rather than an intentional choice.
- **3a-iv (steeper angle)** — cut: starts to resemble a checkmark/swoosh rather than an X.
- **3a-v (tonal orange halves)** — cut: same reliability problem as 3f.
- **3a-vi (separated halves with a gap)** — cut: gap risks visually closing up and merging into a blob at small sizes; not worth the risk given the mark needs to survive a 24–32px floor.

**Final direction: 3a-ii — wide-stance angular split X.**
Chosen over the original narrower stance (3a-i) because the wider gap between the two halves reads as a clean X faster and holds up better under a small-size legibility test (tested down to 32px). Both a navy-background (white/orange) and white-background (navy/orange) version were confirmed to work.

---

## 4. Route/Pin Exploration (Direction 4)

Several route- and pin-based motifs were tried as a second, more literal "logistics" visual:

- **4a (curved dotted route)** — cut: dashes and curves lose all meaning once shrunk, unusable as a standalone icon.
- **4b (angular route, grid-style)** — kept and became the basis of the eventual secondary asset (see Section 6).
- **4c (classic solid map pin)** — cut as a primary mark: too generic, reads as "maps app" rather than "ANX" specifically. Noted as potentially useful later as a supporting icon (e.g. delivery tracking UI), not the brand mark.

At this stage, 4b (route line) and 3-series (X monogram) were still separate, competing ideas — one visual language for the icon, a different one for the "route" storytelling.

---

## 5. The Merge — X as Both Route-Endpoint and Letter

A key turning point: rather than keeping the X-monogram and the route motif as two separate assets, the route line was redesigned to terminate directly into the X — with the X doing double duty as (a) the third letter of "ANX" and (b) the route's destination marker ("X marks the spot").

**Problems caught and fixed along the way:**
- An early version had a visible gap between the route line and the X — flagged as a bug, not a style choice, since the line must read as one continuous stroke into the letter.
- An early version paired a thin route line with a heavy crossbar X, which read as two mismatched visual languages bolted together rather than one mark. Flagged as a real tension in the concept, not just a detail.
- This concept was refined further outside this conversation (via a separate tool pass) into working, resolved versions — confirmed clean, with the route flowing directly into the X with no seam, both in a stacked lockup and a horizontal lockup with "LOGISTICS" as a subordinate line.

**Conclusion on this direction:** kept as a **secondary asset** (splash screens, document headers, marketing contexts) — not the primary mark or app icon. At small icon sizes, the "AN" and route line disappear and the X alone becomes an ambiguous orange cross with no meaning on its own. This was an explicit, deliberate scope decision, not an oversight.

---

## 6. X-as-Letter Lockup (Primary Wordmark System)

Once 3a-ii was locked as the primary icon, the next decision was how the icon integrates with "AN" as a full wordmark, replacing a plain typed "X" with the icon itself.

**Baseline treatment tested:**
- **6a (icon at 1.5x scale, strongly raised above baseline)** — cut: the X reads as a disconnected object floating next to "AN" rather than part of the same word.
- **6c (icon at ~1.15x scale, subtly raised)** — **kept.** Emphasizes the X as the visual focal point (per the goal of the X being the main eye-catch) while still reading as one unified word, not two objects.
- Small-size test at letterhead/header scale confirmed 6c's proportions hold up — the X still pops, still legible, at reduced size.

---

## 7. Typography

No real typeface had been chosen through most of this process — every early mockup used Arial or system fonts as a placeholder, which was explicitly flagged as unfinished, not a decision.

**Candidates tested against the finished X icon** (all real, licensed geometric sans-serifs, not placeholders):

- **Space Grotesk** — squared-off, technical feel; best geometric match to the icon on paper.
- **Sora** — rounded, friendly, geometric; visually closer to Poppins than expected, which reintroduced the same softness mismatch.
- **Archivo** — dense, bold, industrial; initially flagged as a risk for being heavy enough to visually outweigh the X and shift emphasis away from it.
- **Poppins** — used only as the "placeholder" reference point; confirmed as the weakest pairing of the four.

**Decision process, not just outcome:** Archivo was chosen based on a direct visual comparison at small size — the user correctly identified that Archivo's heavier stroke weight matched the X icon's solid color fill closely enough that "AN" and the X read as one cohesive object, whereas the lighter fonts created a perceived gap despite identical letter-spacing. This was verified, not just accepted on preference:
- Tested at hero size in full color — held up.
- Tested in single-color navy-on-white and white-on-navy (embroidery context, no orange contrast to lean on) — the X still read as distinct from the letters on shape alone, confirming the pairing works even without color doing the work.
- Tested at 700 vs 800 weight — negligible difference; 800 kept.

**Final: Archivo, 800 weight, for wordmark/headers.** Body text (dense UI, documents) intentionally left as a separate, lower-stakes decision — either a lighter Archivo weight or a neutral pairing font (e.g. Inter) — since setting long text in an 800-weight display font would hurt readability.

---

## 8. Final Lockup System

With the X-as-letter approach, a plain "wordmark-only" version (no icon) was dropped as unnecessary — the icon *is* the third letter now, so there's no scenario needing "ANX" typed without it. The finalized set:

**Full lockup (AN + X icon):**
- Navy background, full color
- White background, full color
- Single-color navy (constrained print)
- Single-color white (embroidery)

**Icon-only (X alone):**
- Navy bg / white bg / single-color navy / single-color white
- App icon (rounded-square format)

**Minimum size floor confirmed:** icon-only remains legible down to 24px; below that, don't use it — no smaller fallback was built since current use cases don't require one.

**Known open issue, not yet resolved:** in the single-color versions, the two triangle halves of the X sit closer together than in the two-tone version, and can read slightly more like a bowtie than a crisp X. Flagged for adjustment once physical embroidery/print samples exist — not corrected preemptively without a real sample to check against.

---

## 9. Clear Space & Minimum Size Rules

- Clear space on all sides ≥ the height of the X icon in that lockup (scales with size automatically rather than being a fixed pixel value).
- Full lockup: minimum ~100px on screen / ~1 inch in print.
- Icon-only: minimum 24px on screen / ~0.5 inch in print or embroidery. Nothing smaller is currently specified.

---

## 10. Usage Don'ts

1. Don't stretch or distort disproportionately.
2. Don't recolor outside navy / orange / white (or the approved single-color navy/white variants).
3. Don't place on busy photos or low-contrast colors.
4. Don't rotate the mark.
5. Don't add drop shadows, gradients, or outlines not in the source files.
6. Don't hand-redraw or recreate it "close enough" in Canva or elsewhere — always use the actual exported source file.

---

## 11. Uniform Application

Mockups produced for polo/T-shirt, rider jacket (front + back), and cap, replacing the original plain-text "ANX" placeholder with the finished icon.

**Decision on embroidery cost:** garment base color is navy, so the icon's navy sections require no stitching at all — only orange and white thread are needed. This was the user's own idea, and a better version of an earlier suggestion to deliberately simplify to two colors — this approach gets a 2-color-equivalent result for free from the garment choice itself, rather than needing a separate simplified asset.

**Added during mockup, not previously decided — needs explicit sign-off:** hi-vis orange side strips on the rider jacket, for road visibility. This was introduced as part of the mockup and has not been separately approved as a locked brand element; flag to the client before treating it as final.

**Helmet mockup (front + side view)** was produced separately, using the same orange hi-vis stripe treatment as the jacket for consistency, with the X icon placed above the visor line (front) and on the side panel (side view). This carries the same sign-off flag as the jacket strips — it's a proposed treatment, not a confirmed one.

**Open manufacturing question, specific to the helmet:** unlike the shirt/jacket/cap (soft goods, straightforward embroidery), helmets are safety equipment typically sold with a fixed molded shell color, and adding a painted stripe or decal may be constrained by the supplier's process or by reflectivity/durability standards for road safety gear. This mockup should not be assumed to translate directly to a real product — confirm with the actual helmet supplier what customization (paint, reflective sticker, strap embroidery) is actually available before ordering.

**Open action item:** confirm the physical fabric's navy color actually matches `#0A1F44` before bulk ordering — supplier "navy" stock can differ from a hex value, and a visible mismatch between fabric and other navy brand assets would look like an error.

---

## 12. Marketing Template

One reusable promotional template was built (WhatsApp/Instagram square format, 1080×1080), using the full lockup, palette, and Archivo typography, with a subtle route-line background texture and a large icon watermark.

**Explicitly not done:** this is a single template with one message type ("order now" / promotional). Variants for other message types (hiring announcements, service-area updates, brand-awareness posts without a CTA) have not been built and shouldn't be assumed to exist from this one asset.

**Bugs caught during production, fixed before delivery:**
- Caption text overlapping between uniform mockup columns — layout bug, fixed.
- Icon watermark rendering off-white due to a leftover opacity setting — fixed to pure white.

---

## 13. Not Yet Done

- Real-context application: dropping the finished lockup into an actual rider app login screen and admin dashboard header (explicitly deferred — app work paused for this branding phase).
- Additional marketing template variations beyond the one promotional layout.
- Single-color X spacing refinement (Section 8's open issue), pending physical samples.
- Sign-off from the client on the hi-vis jacket strip addition.
- Fabric-navy-vs-hex color match confirmation before bulk uniform ordering.
- Full export/handoff package (multi-size PNGs, app icon set at all required resolutions, one-page usage reference) — assets so far exist as source SVGs and single PNG exports, not yet packaged for handoff.
