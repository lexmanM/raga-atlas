# Interaction patterns

How the interface behaves once someone touches it. Visual craft gets attention; this is what earns trust.

## Every interactive element has five states

Ship all of them, or the control is unfinished:

1. **Default** — at rest.
2. **Hover** — desktop only; it must not be the *only* way to discover the element exists, because touch has no hover.
3. **Focus-visible** — keyboard. A 2px ring at 2px offset, at **3:1 against both the element and the page behind it**. Never `outline: none` without a replacement; use `:focus-visible` so mouse clicks do not paint rings.
4. **Active/pressed** — instant feedback on press, within 100ms. A scale of `0.98` or a one-step darkening.
5. **Disabled** — and it must say *why*, nearby. A greyed button with no explanation is a dead end; prefer keeping it enabled and explaining the problem on click.

Add **loading** (any element that triggers async work) and **selected** (any element in a set) where they apply.

Hover and focus should not be the same treatment. Hover says "this is clickable"; focus says "this is where you are."

## Response time governs everything

Thresholds people actually perceive:

| Delay | What the user feels | What to do |
|---|---|---|
| **< 100ms** | Instant, direct manipulation | Nothing. Never add an artificial delay |
| **100ms – 1s** | Noticeable but continuous | No spinner — it flashes and reads as a glitch |
| **1s – 10s** | Flow is broken | Show progress; keep the interface responsive |
| **> 10s** | They leave | Let them leave. Notify on completion |

Two rules that follow:

- **Delay spinners by ~400ms.** Most responses come back sooner, and a spinner that appears and vanishes feels *slower* than nothing.
- **Skeletons when you know the shape, spinners when you do not.** A skeleton that matches the real layout makes the wait feel shorter and prevents the layout jump on arrival.

**Be optimistic** where the operation nearly always succeeds (likes, toggles, reordering, adding a tag): apply the change immediately, reconcile in the background, and roll back with a clear message if it fails. Do not be optimistic about payments, deletions, or anything the user would act on differently if they knew it had failed.

## Feedback

Every action produces a visible result. If nothing appears to happen, the user does it again — which is how duplicate records get created.

- **In place beats a toast.** Show the result where the action happened; a toast in the far corner is often missed entirely.
- **Toasts** for transient confirmation only, 4–6 seconds, dismissible, never for errors that need action and never stacked more than two or three deep.
- **Inline for errors that need a fix**, next to the thing that needs fixing.
- **Undo beats confirm.** A confirm dialog interrupts every user to protect against a rare mistake, and people learn to click through it without reading. A 10-second undo protects better and costs nothing in the common case. Reserve confirmation for the genuinely irreversible — and there, make them type the name of what is being destroyed, not just click "Yes."

## Forms

The place where bad UX costs the most money.

- **Labels above fields, always visible.** Placeholder-as-label fails the moment someone types, fails autofill, and fails screen readers. Placeholders are for format examples and nothing else.
- **One column.** Multi-column forms cause skipped fields; the eye's path down a single column is unambiguous. Exception: genuinely paired fields (city/state, first/last, expiry/CVC).
- **Ask for less.** Every field needs a reason it exists. Optional fields are the ones to cut, and marking the *optional* ones (rather than the required ones) is clearer when most are required.
- **Validate on blur, not on keystroke.** Telling someone their email is invalid while they type the third character is hostile. Once a field has errored, *then* re-validate live so they see it resolve.
- **Keep the submit button enabled.** A disabled submit hides which field is wrong; let them click and take them to the first error.
- **Never discard input.** Not on validation failure, not on session expiry, not on back-navigation. Preserve it, then restore it.
- **Errors say what to do**, adjacent to the field, in plain language: "Passwords need 8+ characters" — not "Invalid input." On a long form, also summarize at the top with links to each broken field.
- **Format for them.** Accept the phone number, card number, or date in whatever form it arrives and normalize it. Rejecting spaces in a credit-card number is a choice someone made to save an afternoon.
- **Type the inputs properly**: `autocomplete` tokens (this is what makes password managers and browser autofill work), `inputmode` and `type` so mobile shows the right keyboard, `name` attributes that make sense.
- **Set a real default** wherever one is defensible. The best field is the one already filled correctly.
- **iOS zoom trap**: any input with a font-size under 16px makes Safari zoom the page on focus. Use 16px minimum on mobile inputs.

## Navigation and information architecture

- **Always answer "where am I"** — a visible current state in the nav, a title, a breadcrumb on anything more than two levels deep.
- **5–9 top-level items.** More than that and people scan instead of recognize. If you cannot get there, the grouping is wrong, not the count.
- **Three clicks to anything that matters** — though depth matters less than each step being obviously correct. People will click six times happily if every click confirms they are on the right path.
- **The URL is state.** Filters, tabs, opened items, and search terms belong in it, so that back, refresh, bookmark, and share all work. An app where the back button destroys the user's work is broken regardless of how it looks.
- **Recognition over recall.** Show the options rather than making people remember them. Search is a supplement to browsable structure, not a replacement for it.
- **Jakob's law**: people spend most of their time on other sites, so conventional placement (logo top-left linking home, search top-right, cart far right, primary nav across the top) is not unoriginality — it is free usability. Break convention only where you are genuinely better, and expect to pay for it in teaching.

## The states people forget

Design these before the happy path is finished; they are where real users spend a surprising share of their time.

- **Empty** — teach, do not apologize. What this is, why it is worth filling, and the single button that fills it. Ignore the temptation to add sample data the user then has to clean up.
- **First-run** — the product before any configuration. Often the most-seen screen you never look at.
- **Loading** — skeletons matching final layout; never a blank screen; never a layout that jumps on arrival (reserve the space).
- **Partial** — some data arrived, some failed. Render what you have and flag the rest; do not blank the page over one failed panel.
- **Error** — what happened, why, what to do next, in the user's language. A retry button where retry could work. Never an error code alone, and never blame the user.
- **Offline** — say so, keep what you can, queue what you must.
- **Too much** — 10,000 rows, a 200-character name, an eight-line address. Every layout has a breaking input; find yours.
- **Success** — the end of the job. Confirm it, and offer the next reasonable action.

## Motion

Motion explains change. Anything that does not explain something is noise.

- **Micro-interactions** (hover, press, toggle, checkbox): **100–200ms**
- **Medium** (dropdown, popover, accordion, tab change): **200–300ms**
- **Large** (modal, page transition, drawer): **300–400ms**
- **Nothing blocking runs past 400ms.** Slow animation on a frequent action becomes intolerable by the fiftieth use.

**Easing**: `ease-out` for things entering (fast start, gentle landing — feels responsive), `ease-in` for things leaving, `ease-in-out` for things moving between two on-screen positions. Linear only for spinners and progress.

**Animate cheap properties**: `transform` and `opacity` only. Animating `width`, `height`, `top`, or `margin` triggers layout on every frame and janks on mid-range hardware.

**Honor `prefers-reduced-motion`** — replace movement with a fast fade, never remove the feedback entirely. This is a vestibular-disorder accommodation, not a preference.

**Respect origin.** A menu grows from the button that opened it; a modal scales up from center; a drawer slides from its edge. Motion that contradicts spatial logic is disorienting.

## Touch and mobile

- **Minimum target 44×44px** (Apple HIG) / **48×48dp** (Material). WCAG 2.2 sets 24×24 CSS px as the AA floor — treat that as the legal minimum and 44px as the design target. The *visual* element can be smaller than its hit area.
- **8px minimum between adjacent targets**, more for destructive ones. A delete button adjacent to a common action will be mis-tapped.
- **Thumb zone**: primary actions in the bottom third on phones. Top-corner placement is a reach on a modern large-screen phone.
- **No hover-dependent information.** Tooltips carrying essential content simply do not exist on touch.
- **Respect safe areas** (`env(safe-area-inset-*)`) around notches, home indicators, and rounded corners.
- **Gestures need a visible alternative.** Swipe-to-delete is a nice accelerator and a terrible only path.
- **Test with a real thumb on a real device.** Emulators do not reproduce the occlusion problem: your hand covers a third of the screen, often exactly where you put the feedback.
