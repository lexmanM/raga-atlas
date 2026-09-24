# UX standards and review process

How Rāga Atlas judges its own interface. These documents are the source of
truth for design decisions in this repository, and they are written to be used
by anyone — a contributor reading them by hand, or any tool asked to review a
screen. Nothing here requires particular tooling.

Two failure modes count equally as failures:

- **Handsome but confusing.** A screen that photographs well and strands the
  user. Proportion without a clear next action is decoration.
- **Usable but ugly.** Every control reachable, nothing broken, and the product
  reads as cheap. Aesthetic quality is a usability property: people trust,
  forgive, and persevere with interfaces that look considered.

## The documents

| File | Covers |
|---|---|
| [`visual-system.md`](visual-system.md) | Type scale and rhythm, the spacing grid, proportion and layout ratios, color and neutrals, elevation, dark mode, optical corrections |
| [`interaction-patterns.md`](interaction-patterns.md) | Interactive states, response-time thresholds, forms, navigation, empty/loading/error states, motion, touch |
| [`accessibility.md`](accessibility.md) | The WCAG 2.2 AA floor, keyboard, semantics, and how to test it |

## Running a review

**1. Get the context.** Who is the user, what is the one job of this screen,
what device, and what happens immediately before and after. A raga reference
consulted mid-practice on a phone earns a different critique from the same
layout on a desktop.

**2. Look at the real thing.** Never review from source alone; it hides what
only rendering reveals — collapsed spacing, wrapping, contrast under real
content, overflow. Run `npm run dev` and view the page at **1440px**,
**768px**, and **390px** wide.

**3. Measure before you opine.** Paste [`../../scripts/ux-audit.js`](../../scripts/ux-audit.js)
into the devtools console. It reports the type sizes actually in use, spacing
off the 4px grid, contrast failures against the real composited background,
undersized tap targets, unlabeled controls, heading-order breaks, and
horizontal overflow. Facts beat taste, and a number is checkable.

**4. Apply the first-glance test.** Look at the screen for five seconds and
write down honestly: what is this page, what does it want me to do, and where
does my eye land first. If your eye lands somewhere other than the primary
action, that is the headline finding.

**5. Walk the task, not the layout.** Click the real job end to end — pick a
raga, play the arohana, write a practice loop, save it. Count the steps and the
moments of hesitation. A design reviewed only as a still image hides its worst
problems in its transitions.

**6. Check craft and access** against the three documents above.

## Severity

Rank every finding. A flat list of twenty observations gets nothing fixed.

- **Blocker** — the user cannot complete the job, or is locked out (task
  dead-end, keyboard trap, unreadable text, control unreachable on mobile).
- **Major** — the job completes but costs time, errors, or trust (ambiguous
  primary action, destructive action with no undo, a form that discards input).
- **Minor** — friction a user notices and routes around (off-scale sizes,
  inconsistent radii, missing hover).
- **Polish** — craft that separates good from excellent (optical alignment,
  letter-spacing on display type, shadow layering, easing).

Do not inflate. If nothing is a blocker, say so — a review that cries blocker
at a missing hover state teaches people to ignore reviews.

## Writing a finding

Every finding carries a measurement and a fix in real values. "Increase the
spacing" is worthless. This is a finding:

> **Minor — card padding is smaller than the gaps inside it.**
> `.raga-card` has `padding: 16px` with `gap: 24px` between its rows, so the
> contents look like they are escaping the card. Set `padding: 24px` and
> `gap: 16px` (`app/globals.css:812`), which also satisfies the rule that a
> container's padding is at least its largest internal gap.

Critique the interface, never the person. Ground each claim in a principle
(proximity, Fitts's law, recognition over recall) or a measurement. If it is
genuinely taste, label it as taste and let it be overruled — taste that
pretends to be law is how design reviews turn into arguments.
