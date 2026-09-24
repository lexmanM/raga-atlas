# Visual system

What makes an interface look designed rather than assembled. Every rule here is checkable, so a finding can cite a value instead of a feeling.

## Type

**One scale, four or five steps used.** Pick a ratio and generate the scale; do not choose sizes ad hoc. Ratios that work on screens:

| Ratio | Name | Feels like | Use for |
|---|---|---|---|
| 1.125 | Major second | Dense, quiet | Data-heavy apps, dashboards, tables |
| 1.200 | Minor third | Balanced | Most web apps |
| 1.250 | Major third | Clear, confident | Marketing pages, content sites |
| 1.333 | Perfect fourth | Dramatic | Editorial, landing pages with big heroes |
| 1.618 | Golden | Very dramatic | Display only — it breaks down below ~20px |

A 1.250 scale off a 16px base: **12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61**. Round to whole pixels and keep the rounded values; a scale you re-derive per component is not a scale.

Two practical departures from pure math: small sizes need more steps than the ratio gives (12/14/16 all earn their place), and display sizes can jump the scale freely. The ratio governs the middle, where consistency shows.

**Line height falls as size rises.** Small text needs room to be read; large text needs tightness to read as one object.

- Body 14–18px → **1.5–1.6**
- Large body / lead 20–24px → **1.4**
- Headings 28–40px → **1.2–1.25**
- Display 48px+ → **1.05–1.15**

**Letter-spacing corrects what the size distorts.**

- Display, 40px+: `-0.02em` to `-0.03em` (large type looks loose at default tracking)
- Headings, 24–40px: `-0.01em`
- Body: `0` — leave it alone
- All-caps, small labels, buttons: `+0.04em` to `+0.08em` (caps have no ascenders to separate them)

**Measure (line length): 45–75 characters, 66 is the target.** In practice `max-width: 65ch` for prose, `640–720px` for articles. Long lines lose the reader on the return sweep; short ones break rhythm. This is the most commonly violated rule on full-width layouts.

**Weight carries hierarchy more cheaply than size.** 400 body / 500–600 emphasis / 700 headings. Two weights beat four. Avoid weights under 400 for body text at any size — thin type on a non-retina display is a legibility bug, not a style.

**Never center more than three lines.** Centered paragraphs give the eye no fixed left edge to return to.

## Spacing

**One base unit, and a scale built from it.** 4px base, 8px rhythm:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

Every margin, padding, and gap comes from this list. A `13px` or `18px` in the computed styles is almost always an accident; `audit-page.js` flags off-scale values.

**Proximity is the grouping mechanism.** The gap between related items must be visibly smaller than the gap to the next group — aim for **at least 1.5×, ideally 2×**. A label 8px above its input inside a 24px-separated form reads correctly; at 16px/24px the form reads as a soup of equal elements.

**Container padding ≥ the largest gap inside it.** A card with 24px internal gaps and 16px padding looks like its contents are escaping.

**Nested radius: outer = inner + padding.** A 16px-padded card holding an 8px-radius button wants a 24px radius. Concentric corners look machined; mismatched ones look glued together.

**Vertical rhythm.** Consistent spacing above and below repeated blocks, all landing on the 4px grid. Headings take more space above than below — the space belongs to the section that follows (`margin-top: 48px; margin-bottom: 16px`), which is the opposite of what most default stylesheets do.

**Whitespace is not wasted space.** When something feels cheap, the answer is almost always more space between groups and less decoration — not a bigger font or a heavier border.

## Proportion and layout

**Content widths.** Full-bleed sections; content column `1200–1280px`; prose `640–720px`; forms `400–480px` (a wide form invites the eye to wander across empty space between label and field).

**12-column grid**, gutters `24px` desktop / `16px` mobile. Twelve divides by 2, 3, 4, and 6, which covers nearly every split you will want.

**Useful ratios for splits** — use them deliberately, and stop there:

- **62/38** (golden) — sidebar + content, hero image + copy. The classic asymmetric split; it looks intentional in a way 60/40 does not.
- **2:1 / 3:1** — feature grid against a rail.
- **50/50** — only when the two halves are genuinely equal in importance; otherwise it reads as indecision.

Golden-ratio mysticism is overrated: it is a good default for one or two big decisions per page and worthless applied to every dimension. Do not derive your type scale, button padding, and border radii from φ and call it design — the result is a set of numbers nobody can hold in their head.

**Aspect ratios** for media: `16:9` video, `4:3` or `3:2` photography, `1:1` avatars and tiles, `21:9` cinematic banners. Set them with `aspect-ratio` so layout does not jump while images load — an image without reserved space is a layout-shift bug.

**Alignment: pick an edge and hold it.** Most layouts want one strong left edge running the full page. Every element that breaks it needs a reason. Scan a screenshot for the vertical lines — if there are more than three, the layout is noisy.

**Optical, not mathematical, centering.**

- Play triangles and other asymmetric glyphs need nudging (a right-pointing triangle sits ~1–2px left of mathematical center in a circle).
- A button with a leading icon wants slightly less left padding than right.
- Large type sits optically high in its box; heroes often need 2–4px of downward nudge.
- Round shapes (circles, pills) must overshoot a square's bounds slightly to look the same size — this is why the "o" overshoots the "x" height in every typeface.

## Color

**60/30/10.** 60% dominant neutral (background), 30% secondary (surfaces, borders, muted text), 10% accent. Most bad interfaces are accent-heavy — if the brand color is on the nav, three buttons, six icons, and a badge, it has stopped meaning "act here."

**One accent, used for one thing: the action.** Add a second hue only for semantic state (success/warning/danger), and make those distinguishable by more than hue.

**Neutrals are the product.** Build a 9–11 step neutral ramp and tint it — shift the hue a few degrees toward the accent and give it 2–6% saturation. Pure `#808080` greys look dead next to any saturated content.

**Never the extremes.** Body text `#1a1d21`-ish, not `#000`. Light background `#fafafa`–`#fff`, dark surfaces `#0d0f12`–`#16181d`, never `#000`. Pure black creates halation against white and kills shadow depth, since a shadow on black has nowhere to go.

**Contrast floors** (WCAG 2.2 AA — enforce these as a hard gate):

- Body text: **4.5:1**
- Large text (≥24px, or ≥18.66px bold): **3:1**
- UI component boundaries, icons carrying meaning, focus rings, chart strokes: **3:1**
- Disabled controls are exempt — but if your "disabled" state is the only signal that something is off, it is failing anyway.

Placeholder text at 2.8:1 is the most common contrast failure in production apps, closely followed by light-grey secondary text on a light-grey surface.

**Color is never the only channel.** State needs an icon, a label, or a shape alongside the hue — for color-blind users, for greyscale printing, and for anyone glancing at a phone in sunlight.

**Working in OKLCH pays off**: equal lightness steps look equal, which HSL does not deliver (HSL yellow at 50% lightness is far brighter than HSL blue at 50%). Generate ramps by stepping L and holding C and H.

## Control taxonomy

The rule: **form follows consequence.** A control's visual weight should track how
much of the product it changes. When two controls share a shape, users read them
as peers — so a cosmetic preference styled like a mode switch teaches people that
neither one matters.

Every interactive element in Rāga Atlas belongs to exactly one of these roles, and
each role has exactly one signature. If a new control does not fit a row, the row
is wrong and gets revised — do not invent an eighth style.

| Role | Question it answers | Signature | Here |
|---|---|---|---|
| **Scope** | *Which world am I in?* | Pill group, **filled** active segment (`--prototype-gold` on `--on-accent`), 13px, 600 weight. The heaviest control on the page | Carnatic ⇄ Hindustani |
| **Navigation** | *Which view?* | Underlined tabs, 2px accent bottom border on active, no container | Atlas / Guitar |
| **Filter** | *Which subset?* | Quiet chips attached to the list they narrow, hairline border at `.16` | All / Mela / Janya |
| **Action** | *Do it now* | Button, `8px` radius, 1px border at `.4`; the primary action is the only gold fill outside Scope | Ārohana, Start loop |
| **Toggle** | *On or off?* | Switch affordance — track and knob. Never a button that merely looks pressed | Drone, Keyboard, Click |
| **Input** | *Give me a value* | Inset background, `2px` radius, visible label above | Rāga field, tempo, sargam box |
| **Preference** | *How should it look?* | The quietest thing on screen: icon-only, name on `aria-label` and `title` | Theme |

Two supporting scales keep the signatures apart, and both are closed sets:

- **Radius carries meaning.** `2px` input · `8px` button or key · `999px` segment group.
  Nothing else. Six arbitrary radii is the same as none.
- **Border alpha carries emphasis.** `.16` quiet · `.4` emphasis. Two values.

**Uppercase is a section-label device, not a control device.** When every control is
uppercase with wide tracking, caps stop signalling importance and start costing
legibility — all-caps removes the word shapes people scan by. Controls are sentence
case; uppercase with `.3em` tracking is reserved for section labels.

### Section hierarchy

Three levels, visibly different, or a long page reads as an undifferentiated list:

1. **Page subject** — the rāga name, `clamp(38px, 5vw, 76px)` display serif.
2. **Section heading** — **18–22px**. The zone a reader navigates by.
3. **Sub-label** — 12px uppercase, `.3em` tracking, accent at `.72`.

Levels 2 and 3 collapsing into one style is the most common way a page ends up
feeling like "a lot of features" with no sense of what is present.

## Elevation and depth

**Shadows are two layers, not one.** A tight ambient shadow for contact plus a soft directional one for lift:

```css
/* resting card */
box-shadow: 0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.10);
/* raised / hover */
box-shadow: 0 4px 6px rgb(16 24 40 / 0.05), 0 10px 15px rgb(16 24 40 / 0.10);
/* modal */
box-shadow: 0 8px 10px rgb(16 24 40 / 0.04), 0 20px 25px rgb(16 24 40 / 0.10);
```

Rules of thumb: y-offset ≈ blur ÷ 2, opacity **falls** as the element rises (higher things cast softer, more diffuse shadows), and the shadow color is a dark tinted neutral at low alpha — never `rgba(0,0,0,0.5)`, which reads as grime rather than depth.

**Pick one separation system per surface.** Shadow *or* border *or* a background-color step. All three at once is the visual equivalent of shouting.

**Elevation should mean something**: base < card < dropdown < sticky header < modal < toast. If two things at different z-index levels cast the same shadow, the depth cue is decorative.

## Dark mode

Dark mode is a re-derivation, not an inversion.

- Background `#0d0f12`–`#16181d`, not `#000`. Surfaces get **lighter** as they rise, since shadows are nearly invisible on dark.
- Body text `#e6e8eb`, not `#fff` — pure white on near-black vibrates and fatigues.
- **Desaturate accents by 10–20%** and raise their lightness; a saturated blue that sings on white glows and bleeds on black.
- Re-check every contrast pair. Passing in light mode says nothing about dark.
- Borders: light mode uses a darker neutral, dark mode uses `rgb(255 255 255 / 0.08–0.12)`.
- Images and illustrations often need a `filter: brightness(.9)` or a dedicated dark asset; a white-background PNG in dark mode is a hole punched in the page.

## The craft details

Small things, individually invisible, collectively the difference between "fine" and "expensive":

- **Consistent radii** from a scale (`4 · 8 · 12 · 16 · full`), nested per the formula above.
- **1px borders that actually render 1px** — beware fractional layouts and transforms that blur them.
- **Real typography**: curly quotes, en dashes in ranges, non-breaking spaces before units, tabular figures (`font-variant-numeric: tabular-nums`) in any column of numbers so digits stop dancing.
- **Truncation with intent** — `text-overflow: ellipsis` plus a `title`, or a clamp at a chosen line count, never a hard cut mid-word.
- **Icons optically sized, not boxed-sized.** A 20px icon next to 16px text usually looks right; matching them exactly makes the icon look small.
- **Hairline separators** at 5–10% opacity, not solid greys.
- **Images**: never stretch, always `object-fit: cover` with a defined aspect ratio, always with a placeholder color or blur to hold the space.
