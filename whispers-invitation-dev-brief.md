# WHISPERS — Digital Invitation
## Developer brief

**Client:** Whispers (Hotel Juno, Sofia)
**Deliverable:** A personalised, single-use invitation page with RSVP capture
**First event:** Saturday 10 October, doors 22:00
**Deadline:** Live and tested by **T–15 days** (invitations go out at T–14)

A reference build already exists as a working front-end prototype. Match its behaviour and feel; it is the design source of truth for motion, timing and copy.

---

## 1. What this is

Each guest receives a private link. Opening it plays a short film, then shows the invitation, then asks them to respond. Accepting requires naming their one guest. Both people then receive a unique seal (a code + QR) that gets scanned at the door.

There is no public page. No event listing, no ticket link, no search result. The only way in is a link we sent.

**The feeling to protect:** restraint. Every instinct to add a countdown timer, a gallery, a social share button, a lineup graphic or an "About" section is wrong. The page says very little on purpose.

---

## 2. Scope

**In scope**
- Personalised invitation page (7 screens, below)
- Guest token system
- RSVP capture with plus-one details
- Unique seal code + QR per person
- Confirmation emails
- Admin view of the guest list
- The T–1 address blast

**Out of scope**
- Payments (the launch is free)
- Accounts or logins
- Any public-facing marketing site

---

## 3. Recommended stack

Two viable routes. **Route A is recommended** — it gets the brand-critical part custom and the boring part free.

### Route A — custom front, Luma back (recommended)

| Layer | Tool |
|---|---|
| Invitation page | Static site (Next.js / Astro / plain HTML) on Vercel or Netlify |
| Domain | `whispers.club` (or similar), HTTPS, no www redirect loops |
| Guest tokens | Static JSON or a Supabase table |
| RSVP, guest list, QR, wallet pass, door scanning | **Luma**, invite-only event |
| Emails | Luma's built-in confirmations + blasts |

The final button on the invitation hands off to the Luma registration URL with the guest's name pre-filled where possible. Luma issues the QR, provides the Apple/Google Wallet pass, the check-in scanner app and a door-staff role with restricted permissions.

**Effort:** ~2–3 days.

### Route B — fully custom

| Layer | Tool |
|---|---|
| Front end | Next.js on Vercel |
| Database | Supabase (Postgres) |
| Emails | Resend or Postmark |
| QR | `qrcode` npm package, generated server-side |
| Door check-in | A second protected route with a camera-based QR scanner |

**Effort:** ~5–7 days. Choose this only if Luma branding at the handoff is unacceptable to the client.

Everything below applies to both routes.

---

## 4. The link

```
https://whispers.club/i/{token}
```

`token` is an opaque, non-sequential string — 10+ characters, generated with a CSPRNG, one per invited guest. Do **not** use incrementing IDs, name slugs, or anything guessable.

**Behaviour:**

| Case | Result |
|---|---|
| Valid token, not yet responded | Full flow |
| Valid token, already accepted | Skip straight to their seal card |
| Valid token, already declined | Short "we have your answer" screen |
| Unknown or missing token | Seal screen only, with: *"This invitation is not addressed to you."* No date, no time, no RSVP, no location. |
| Token expired (past T–7) | *"Responses for this edition have closed."* |

That last behaviour is the point of the whole system. A forwarded link must be visibly useless — it's what makes the invitation feel issued rather than distributed.

For local testing, also accept `?g=Name` to preview the personalised state without a real token.

---

## 5. Screens

Seven states, one at a time, full viewport. Transitions are cross-fades of ~0.9s. No scrolling between screens; scroll only within a screen if content overflows on small phones.

### 5.1 Seal

Centred logo (the black disc lockup). Below it:

> Press and hold to break the seal

And beneath that:

> This invitation was issued to
> **[Guest name]**

**Interaction:** press and hold for 1.25s. A gold ring fills clockwise around the seal as they hold. Releasing early resets it. On completion the seal scales up, flares warm gold and fades out, then the film begins.

Must work on touch and mouse (`pointerdown` / `pointerup`, with `touchstart` fallback). Include a small `Enter ›` escape in the corner for anyone who can't hold.

### 5.2 Film

Full-bleed video, autoplay, **muted**, `playsinline`. Advances automatically on `ended`.

- Format: MP4 (H.264) + WebM, poster frame, under 8 MB
- Ratio: **9:16 portrait** — confirm with client before encoding
- A `Skip ›` control in the corner at all times
- If the video fails to load or autoplay is blocked, fall through to the next screen rather than hanging

The prototype contains a typographic placeholder sequence. Keep it as the fallback.

### 5.3 The invitation

Set as a letter, not a poster. Logo centred at the top, then four rows:

| Label | Value |
|---|---|
| WHEN | Saturday 10 October<br>Doors at 22:00 |
| WHERE | Sofia Center<br>*The address follows* |
| WHO | You, and one person of your choosing |
| INSIDE | Phones stay in pockets on the floor |

Closing line, italic:

> This invitation is not transferable. What happens beneath the rose stays beneath the rose.

One button: **RESPOND**

### 5.4 Respond

> **Will you be there?**
> Saturday 10 October

Two buttons:
- **I'll be there** → 5.5
- **Not this time** → 5.7

Do not attach any consequence, warning or scarcity language to declining.

### 5.5 Your guest

> **One person. Choose well.**
> Their name and address go on the door list with yours. Names cannot be changed after the seventh.

Two required fields:
- **Full name** — must contain at least two words
- **Email** — validated, and must not already appear in the guest list (surface a clear error if it does)

Buttons: **CONFIRM BOTH PLACES** / **BACK**

### 5.6 Confirmed

A seal card showing:
- Logo
- Guest name
- "Founding guest"
- **Seal code** and QR
- Saturday 10 October · Doors 22:00
- Sofia Center · the address reaches you at 18:00 on the 9th
- Bringing: [plus-one name]

Plus: *"Both seals have been sent by email. Show yours at the door."*

### 5.7 Declined

> **Understood.**
> Your place on the list stays where it is.
> You'll hear from us before the next one.

---

## 6. Seal codes

Format: `WSP·10·XXXX`

- One code per **person**, not per pair — the plus-one gets their own
- Unambiguous alphabet only: no 0/O, 1/I/L, 5/S, 8/B
- Unique across the event, checked at generation
- QR encodes a check-in URL containing the code, not the code alone
- Single-use at the door: scanning marks the person checked in; a second scan of the same code shows a clear warning

---

## 7. Emails

Three, all plain and quiet. No hero images, no buttons stacked on buttons, no unsubscribe-heavy footer. Black background, gold rules, the logo, the seal.

| # | Trigger | To | Content |
|---|---|---|---|
| 1 | On accept | Guest | Their seal, date, time, "Sofia Center — address follows" |
| 2 | On accept | Plus-one | Same, plus *"[Guest] has brought you."* |
| 3 | 18:00 on 09.10 | Confirmed only | The address, and nothing else |

Plus one reminder at **T–3 days** to anyone who hasn't responded. Responses close at **T–7**.

Sender: `invitations@whispers.club`. Set up SPF, DKIM and DMARC before the first send — an invitation that lands in spam is the single worst failure mode in this project.

---

## 8. Admin

A password-protected route showing:

- Live counts: invited / accepted / declined / no response / checked in
- Full guest list with plus-ones, exportable to CSV
- Search by name or code
- Manual check-in by name for anyone whose phone is dead

Cap enforcement: **150 total people**. Once accepted guests + plus-ones reach 150, further accepts show a waiting-list state rather than confirming.

---

## 9. Design

| Token | Value |
|---|---|
| Background | `#0B0908` |
| Panel | `#12100E` |
| Gold | `#D9AE78` |
| Gold dim | `#8B6F4C` |
| Crimson | `#A31621` |
| Bone | `#EDE6DA` |
| Muted text | `#8C8176` |

- **Display / body serif:** Cormorant Garamond, 300 weight
- **Labels / buttons:** Jost, 300 weight, uppercase, 0.3em letter-spacing
- Buttons are outlined, never filled, except the single primary action per screen
- A fine film-grain overlay at ~5% opacity, and a vignette
- Logo assets supplied: black-disc lockup (PNG, transparent) and line version (PNG, transparent)

Dark only. Do not build a light mode.

---

## 10. Technical requirements

- Mobile first. Most guests will open this on a phone, at night, one-handed.
- Works on iOS Safari 16+, Chrome Android, and desktop Safari/Chrome/Firefox
- No horizontal scroll at 320px width
- Respects `prefers-reduced-motion`: skip the seal animation and cross-fades
- Total page weight under 1.5 MB excluding video
- No analytics that set third-party cookies; if tracking is needed use a privacy-first tool
- GDPR: the plus-one's name and email are personal data collected from a third party. Include a one-line privacy notice on the plus-one screen and a retention policy (delete after the event unless they opt in to future invitations).

---

## 11. Test checklist before launch

- [ ] A valid token opens with the right name
- [ ] An invalid token reveals nothing — no date, no time, no location
- [ ] Revisiting after accepting goes straight to the seal card
- [ ] The same email cannot be used as two different plus-ones
- [ ] The cap holds at 150
- [ ] Both confirmation emails arrive in the inbox, not spam, on Gmail, Outlook and iCloud
- [ ] QR scans correctly on the door device, in the dark, off a dimmed screen
- [ ] A second scan of the same code is refused
- [ ] Seal hold works on iPhone and on Android
- [ ] Video autoplays muted; the flow continues if it doesn't
- [ ] Full flow tested on a 320px-wide phone

---

## 12. Open items for the client

1. Domain name and who owns it
2. Final video file and aspect ratio
3. Route A or Route B
4. The list of founding guests with names and emails
5. Who staffs the door scanner
6. Whether the plus-one may bring nobody (i.e. can a guest come alone)
