# WHISPERS Frontend Style Guide

Дата: 2026-09-26

Този документ е дизайн и frontend guardrail за WHISPERS Invite. Целта е при нов код да не се появява нов визуален език, нов тип layout или несъвместимо поведение. Всеки нов публичен екран, ticket екран, staff/admin изглед или email preview трябва да следва тези правила, освен ако изрично не решим да променим дизайн системата.

## 1. Design Principle

WHISPERS не е marketing site. Не е event landing page. Не е ticket marketplace.

Това е частна, cinematic покана. Стилът трябва да остане:

- restrained
- dark
- intimate
- cinematic
- mobile-first
- iPhone/Safari-first
- минимален като текст и визуален шум

Всеки instinct за countdown, gallery, social sharing, oversized hero, decorative cards, random gradients, bright UI, badges, playful effects или “повече неща на екрана” трябва да се счита за грешна посока.

## 2. Source Of Truth

При frontend промени гледаме в този ред:

1. `whispers-invitation-dev-brief.md` - оригинален tone/design brief.
2. `index.html` - реалният public invite визуален език.
3. `functions/ticket/[token].js` - ticket визуален език.
4. `functions/staff/rose-door-10.js` - internal/admin вариант на същата система.
5. `docs/whispers-page-copy-2026-09-26.md` - текущият copy inventory.

Ако нов дизайн противоречи на тези източници, не го добавяме без изрично решение.

## 3. Core Tokens

Използвай съществуващите CSS variables. Не добавяй нова палитра без основателна причина.

| Purpose | Token | Value |
|---|---|---|
| Background | `--bg` | `#070605` / близко до `#0B0908` |
| Gold | `--gold` | `#D9AE78` |
| Highlight gold | `--gold-hi` | `#EBCB95` |
| Dim gold | `--gold-dim` | `#8B6F4C` |
| Crimson / warning | `--red` | `#A31621` |
| Main text | `--bone` | `#EDE6DA` |
| Muted text | `--mute` / `--muted` | warm grey/bone, never cold grey |
| Lines | `--line` | transparent gold line |
| Paper / QR background | `--paper` | `#F1E9DC` |

Rules:

- Dark mode only.
- No light mode.
- No one-note purple/blue/beige redesign.
- Gold is the only premium accent.
- Crimson is only for danger/warning/already-used states.
- QR backgrounds can be paper-light because QR contrast matters.
- New colors must be added as named CSS variables and documented here.

## 4. Typography

Current font pairing:

- Serif: `Cormorant Garamond`, weight 300/400.
- Sans: `Jost`, weight 300/400.

Usage:

- Serif is for atmosphere, names, hero text, ticket text, emotional copy.
- Sans is for labels, uppercase metadata, buttons, admin controls and tables.
- Labels/buttons use uppercase and wide tracking.
- Body/copy must stay light, quiet and spacious.

Rules:

- Do not add new fonts.
- Do not use heavy font weights.
- Do not use viewport-width font scaling directly. Use `clamp()` with sensible min/max.
- Do not use negative letter spacing.
- Names must allow wrapping with `overflow-wrap:anywhere`.
- Long Bulgarian strings must be tested on small iPhone widths.

## 5. Layout System

Public invite screens are full-viewport scenes:

- One active screen at a time.
- `height: 100vh` plus `height: 100dvh`.
- Safe-area padding with `env(safe-area-inset-*)`.
- No page-level horizontal scroll.
- If content overflows, scroll inside the screen, not between screens.
- Keep one primary action per screen.

Spacing:

- Public screens should feel airy, centered and intentional.
- Do not nest cards inside cards.
- Do not turn page sections into floating cards.
- Public screens are frameless.
- Ticket surfaces can look like a printed seal/card, but still remain visually restrained.
- Staff/admin can use panels and tables because it is operational UI.

iPhone requirements:

- Primary QA target is iPhone Safari.
- Must work at 320px width.
- Must respect notch/safe areas.
- Must behave well when the keyboard opens.
- Tap targets should be at least 48px, usually 54-62px.
- Avoid fixed bottom controls that collide with iOS safe area.

## 6. Buttons And Controls

Buttons:

- Use the existing `.btn` / button styling.
- Default buttons are dark/outlined with gold border.
- Primary buttons use the gold fill gradient.
- Only one primary action per public screen.
- Buttons need visible `:focus-visible`.
- Buttons must not resize layout when text changes.

Forms:

- Inputs are dark with thin gold border.
- Labels are uppercase Jost.
- Placeholders are muted/italic.
- Error text is visible crimson/pink, not dark red on dark background.
- Loading/submitting text goes in neutral status text, not in error text.

Toggles/checkboxes:

- Use visual checkbox/toggle affordances, not plain text links.
- Reservation checkbox copy currently stays Bulgarian:
  - `Бихте ли искали да ви запазим маса за събитието?`
  - `Ще се свържем с вас, за да дадем повече данни за резервацията.`

## 7. Motion And Atmosphere

Atmosphere is part of the product, but it must stay quiet.

Allowed:

- Slow fades.
- Soft blur/fade scene transitions.
- Seal hold progress.
- Film-like grain.
- Subtle ambient glow.
- Scanner scanline in staff/admin.

Avoid:

- Bouncy UI.
- Confetti.
- Big parallax sections.
- Decorative gradient blobs/orbs.
- Random component-level animations.
- Motion that blocks the flow.

Accessibility:

- Always support `prefers-reduced-motion: reduce`.
- Reduced motion should remove or shorten animations and transitions.
- If video fails or autoplay is blocked, the flow must continue.

## 8. Assets

Current visual assets live in `assets/`.

Rules:

- Use real/generated bitmap assets when the page needs visual presence.
- Do not create decorative SVG illustrations for the invitation feel.
- Logo/mark assets should stay consistent across public, ticket and staff pages.
- Public pages should not use stock-like dark blurred imagery that hides the subject.
- Any new heavy media must be optimized for mobile and tested on iPhone.
- Video should be portrait-first, preferably 9:16, and must not trap the user if it fails.

## 9. Public Copy Voice

The public invitation voice is short, quiet and deliberate.

Good:

- “Write your name.”
- “Will you be there?”
- “One person. Choose well.”
- “The address follows.”

Avoid:

- Marketing copy.
- Explaining every feature.
- Scarcity pressure.
- Loud CTAs.
- Long instructional paragraphs.
- Emoji.

For registration/ticket states:

- Before 09.10 at 18:00, do not reveal QR, seal code or location.
- Confirmation should say the guest will receive the location and private ticket by email.
- After unlock, ticket copy can show QR, seal code, location and table assignment.

## 10. Ticket Page Rules

The ticket page should feel like the same invitation world, not an external check-in page.

Before unlock:

- Show name if known.
- Show locked state.
- Do not show QR.
- Do not show seal code.
- Do not show exact location.

After unlock:

- Show guest name.
- Show role/relationship.
- Show seal code.
- Show QR that opens the ticket URL.
- Show location.
- Show table assignment if assigned.
- Show checked-in status if already scanned.

QR rules:

- QR always encodes `/ticket/<token>`.
- QR must never encode a check-in endpoint.
- Normal phone scan opens the ticket page only.
- Check-in happens only through staff scanner/admin.

## 11. Staff/Admin UI Rules

Staff/admin is allowed to be denser than the public invite, but it must still use the WHISPERS tokens.

Admin style:

- Utilitarian, compact, scan-friendly.
- Same dark/gold/crimson system.
- Sans-first for tables and controls.
- Serif only for headers, names and result emphasis.
- Tables can horizontally scroll on mobile.
- Scanner result states must be visually distinct:
  - confirmed
  - already inside
  - invalid
  - no connection

Do not make admin look like a separate SaaS dashboard with a new theme.

## 12. Accessibility And Reliability

Every new screen/control must have:

- Keyboard/focus state.
- Enough contrast on dark background.
- Touch-friendly controls.
- No hidden action that only works on hover.
- Error text near the thing that failed.
- Network failure state.
- Empty/loading state for data views.
- Escaped user-provided text when rendered into HTML.

## 13. Implementation Rules

When adding frontend code:

- Reuse existing CSS variables.
- Reuse existing button/input/table patterns.
- Keep public screens in the established scene system unless there is a clear reason.
- Keep route-specific CSS local if the project remains no-build/plain HTML.
- Do not introduce a framework just for styling.
- Do not add CSS libraries.
- Do not add icons unless they serve a clear control purpose.
- Do not link staff/admin from public pages.
- Keep `connect-src` and CSP in mind before adding external assets/scripts.
- Add any new public route to the middleware allowlist and tests.

When changing copy:

- Update `docs/whispers-page-copy-2026-09-26.md` or create a new dated copy inventory.
- Keep organizer-facing/spec docs in sync when the flow changes.

## 14. QA Checklist Before Shipping Frontend Changes

Minimum checks:

- iPhone-sized viewport around 320-390px width.
- iOS Safari behavior if available.
- Desktop sanity check.
- No horizontal scroll.
- Safe-area padding looks correct.
- Forms work with keyboard open.
- Text does not overflow buttons, cards or inputs.
- `prefers-reduced-motion` still works.
- Public flow still feels cinematic and restrained.
- Ticket page locked state hides QR/code/location before 09.10 18:00.
- Staff Scanner, Members and Tables still fit and remain usable.
- `npm test` passes if shared helpers or routes changed.

## 15. Current Design Debt / Watch List

- README and `docs/project-spec.md` still contain some older flow language and should be updated after the final organizer decisions.
- Public copy is mostly English, while the reservation checkbox is Bulgarian. This is intentional for now, but should be reviewed as a language consistency decision.
- The current app is a single large `index.html`. If more screens are added, consider a small local component/style organization step, but do not introduce a full framework without need.
- Admin security is designed/planned but not active yet.
