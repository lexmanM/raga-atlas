# Accessibility

WCAG 2.2 AA is the floor. Most of it is ordinary good design written down, and nearly all of it helps everyone — captions in loud rooms, contrast in sunlight, keyboard paths for power users.

## The gates that catch most failures

**Contrast** — 4.5:1 body text, 3:1 large text (≥24px, or ≥18.66px bold), **3:1 for non-text**: input borders, icon buttons, focus rings, toggle states, chart lines. The non-text rule is the one most teams have never read, and it is why so many "clean" forms have invisible field boundaries.

**Keyboard** — every interactive element reachable by Tab, operable by Enter/Space, in a tab order that matches visual order. Test by unplugging the mouse and doing the primary task.

- **No traps.** If Tab gets in, Tab must get out.
- **Focus visible at all times.** If you cannot see where you are, the keyboard path does not exist.
- **Skip link** to main content as the first focusable element on pages with long navigation.
- **Modals**: focus moves in on open, is trapped while open, Escape closes, and focus **returns to the element that opened it**. That last step is the one that gets skipped.
- **No keyboard-only side effects** — nothing important should happen only on hover or only on mouse-down.

**Semantics** — use the element that means the thing.

- `<button>` does something; `<a href>` goes somewhere. A `div` with an onClick is invisible to assistive tech and unreachable by keyboard. This single substitution is the most common accessibility bug in React codebases.
- **Headings in order**, no skipped levels, one `<h1>` per page. Screen reader users navigate by heading far more than by reading top to bottom.
- **Landmarks**: `header`, `nav`, `main`, `aside`, `footer`. One `main`.
- **Labels**: every input has a `<label for>` or `aria-label`. An icon-only button needs an accessible name — this is the second most common failure.
- **Lists are lists**, tables are tables with `<th scope>` and a `<caption>`. A layout built from divs tells a screen reader user nothing about structure.

**Images** — meaningful images get alt text describing their *function*, not their appearance ("Submit order", not "blue button image"). Decorative images get `alt=""` so they are skipped. An alt attribute that repeats the adjacent caption is noise.

## ARIA, used correctly

**First rule of ARIA: do not use ARIA.** A native `<button>`, `<select>`, `<details>`, or `<dialog>` brings keyboard behavior, focus management, and screen reader semantics for free. Bad ARIA is worse than no ARIA — it actively lies to assistive technology.

When you do need it:

- `aria-live="polite"` on regions that update asynchronously (search results count, save status, validation summaries). Without it, a screen reader user never learns the page changed.
- `aria-live="assertive"` only for genuine urgency; it interrupts.
- `aria-expanded`, `aria-controls`, `aria-current` on disclosure and navigation patterns.
- `aria-describedby` to tie help text and error messages to their field.
- `role="dialog"` with `aria-modal="true"` and a labelled title, if you cannot use `<dialog>`.
- Never `aria-hidden` on anything focusable — that creates an element that can be reached but not announced.

## Beyond the checklist

- **Color is never the only signal.** Required fields, error states, chart series, and status badges all need a second channel (icon, text, pattern, position).
- **Zoom to 200%** must not break layout; **400%** must reflow to a single column without horizontal scrolling (WCAG 1.4.10). Test by narrowing the window — a `min-width` wider than the viewport is the usual culprit.
- **Text resizes** — use `rem`, never fix a container height around text that can grow.
- **`prefers-reduced-motion`** respected for anything that moves, scales, or parallaxes.
- **Autoplay**: no audio without a control; nothing that flashes more than 3 times per second (seizure risk).
- **Timeouts** warn and are extendable. A session that discards a half-filled form silently is a failure for anyone who works slowly.
- **Target size 24×24 CSS px** minimum with adequate spacing (WCAG 2.2 AA, 2.5.8) — aim for 44px.
- **Dragging has a non-drag alternative** (2.2 AA, 2.5.7): a reorder handled only by drag-and-drop excludes people who cannot drag. Provide buttons or a numeric position.
- **Accessible authentication** (2.2 AA, 3.3.8): no cognitive-function test with no alternative — allow paste into password and OTP fields. Blocking paste breaks password managers and helps no one.

## Testing it for real

Automated tools catch roughly a third of issues. Run them, then use your hands:

1. **axe DevTools or Lighthouse** — catches contrast, missing labels, ARIA misuse. Fix everything it flags first; it is cheap.
2. **Keyboard only** — unplug the mouse, complete the primary task. This finds more than any tool.
3. **Screen reader** — VoiceOver on macOS (`Cmd+F5`) or NVDA on Windows. Listen to the form, the nav, and one error state. The first time is uncomfortable and extremely informative.
4. **Zoom to 400%** and narrow the window.
5. **Greyscale the page** (devtools rendering panel) and check that every state is still distinguishable.

When reporting an accessibility finding, cite the success criterion (e.g. "1.4.3 Contrast (Minimum)"), the measured value, and the fix. It makes the finding actionable and non-negotiable in a way "this should be more accessible" never is.
