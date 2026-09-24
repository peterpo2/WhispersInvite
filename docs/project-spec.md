# Whispers Invite — Full Project Spec

**Live URL:** https://whispers-invite.pages.dev  
**Door scanner:** https://whispers-invite.pages.dev/staff/rose-door-10  
**Ticket page:** https://whispers-invite.pages.dev/ticket/{token}  
**Repo:** https://github.com/peterpo2/WhispersInvite  
**Stack:** Cloudflare Pages + Functions · Supabase (Postgres) · Vanilla HTML/JS  

---

## Event

- **Name:** WHISPERS
- **Venue:** Hotel Juno, Sofia Center
- **Date:** Saturday 10 October 2026
- **Doors:** 22:00
- **Cap:** 150 total people (guests + plus-ones combined)
- **Address:** revealed by email at 18:00 on 9 October

---

## Invitation Flow (7 screens)

### Screen 1 — Seal
- Black disc logo centered, SVG ring around it
- "Press and hold to break the seal" — holds for 1.25s
- Gold ring fills clockwise during hold; releases reset it
- On complete: seal scales up, flares gold, fades out → film begins
- "Enter ›" escape button in corner for accessibility
- **No guest name shown** — shared link, everyone enters own name later

### Screen 2 — Film (typographic placeholder)
- 5 typographic shots, each ~2.3s, cross-fade with subtle upward drift
- Shots: I "A match finds a wick." / II "Secateurs close on a rose stem." / III "Wax pours. The seal goes in." / IV "A coupe fills, from below." / V "A hand draws the curtain closed."
- Real video: MP4 + WebM, 9:16 portrait, autoplay muted, playsinline, under 8MB
- "Skip ›" always visible; auto-advances on `ended` or after all shots
- If video fails → fall through to letter screen

### Screen 3 — Letter
- Left-aligned letter card with logo at top
- Rows: WHEN / WHERE / WHO / INSIDE
- "Not transferable. What happens beneath the rose stays beneath the rose."
- One button: RESPOND → goes to Screen 4 (identify)

### Screen 4 — Identify
- Free text field: "Write your name"
- Requires first + last name (2+ words)
- This becomes the private ticket

### Screen 5 — Respond
- "Will you be there?"
- Two buttons: "I'll be there" → plus-one screen / "Not this time" → submit decline → declined screen

### Screen 6a — Plus-one
- Toggle: "I'm bringing someone"
- If checked: full name + email for plus-one (required, validated)
- Email must not already exist in guest list
- Privacy notice: data used only for this event
- CONFIRM → submits RSVP → confirmed screen

### Screen 6b — Confirmed
- Pass card: logo, guest name, "Founding guest", seal code (WSP·10·XXXX), QR
- Footer: Saturday 10 October · Doors 22:00 · Sofia Center · address 18:00 on 9th
- "Open private ticket" link → /ticket/{token}
- QR encodes the check-in URL

### Screen 7 — Declined
- "Understood. Your place on the list stays where it is. You'll hear from us before the next one."

---

## Seal Code Format

`WSP·10·XXXX` — 4 characters from unambiguous alphabet: `ACDEFGHJKLMNPQRTUVWXY3479`  
Generated client-side from FNV-1a hash of `guestName|plusOneEmail` (or `guestName|solo`)  
**One per person, not per pair** — plus-one gets their own seal on the ticket page

---

## Token / Ticket System

After RSVP submit, backend returns:
- `ticketToken` — URL-safe random string (40 chars, alphanumeric)
- `ticketUrl` — `https://whispers-invite.pages.dev/ticket/{token}`
- `checkInUrl` — `https://whispers-invite.pages.dev/api/checkin?token={token}`

QR on the confirmed screen encodes the `checkInUrl`.  
The ticket page (`/ticket/{token}`) shows the full pass with a new QR.

### Token URL Edge Cases (TODO — not yet implemented in `index.html`)

| Case | Behavior |
|---|---|
| `?token={valid}`, not responded | Normal flow (film → letter → RSVP) |
| `?token={valid}`, already accepted | Skip straight to confirmed/seal card |
| `?token={valid}`, already declined | Short "we have your answer" screen |
| Unknown / missing token | Shared flow (no personalization) |
| Expired (after T–7 = Oct 3) | "Responses for this edition have closed." |

Implementation: on page load, read `?token=` from URL → hit `/api/ticket?token=` → branch on result.

---

## Staff / Door Scanner

**URL:** `/staff/rose-door-10` (secret — not linked from the invitation)  
**Access:** Share this URL only with 2–4 door staff  
**Features:**
- Opens camera (rear-facing, `facingMode:environment`)
- Reads QR codes every 450ms using jsQR library
- Each valid scan → POST `/api/door` → marks `checked_in_at` in Supabase
- Shows: "Confirmed · {name} + {plus-one}" or "Already inside"
- Second scan of same code → "Already inside" warning (not an error)
- Manual entry: paste QR value or token
- "Scanned tonight" list: all check-ins with time, name, seal code

**Door API** (`/api/door`):
- `POST {value}` — extracts token from URL or raw value, marks checked_in_at, returns ticket data
- `GET` — returns last 40 scanned tickets ordered by checked_in_at DESC

---

## Backend API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/rsvp` | Submit RSVP (attending/declined), returns ticketToken + ticketUrl |
| GET | `/api/ticket?token=` | Fetch ticket data by token |
| GET | `/api/checkin?token=` | Mark check-in (used by QR scan), returns HTML |
| POST/GET | `/api/door` | Door scanner: scan/mark + list tonight's check-ins |
| GET | `/api/guests?q=` | Guest name search (legacy, not used in current UI) |

---

## Database (Supabase)

### `guest_list`
| Column | Type | Notes |
|---|---|---|
| id | text PK | token / unique identifier |
| name | text | full name |
| email | text | nullable |
| created_at | timestamptz | auto |

### `rsvps`
| Column | Type | Notes |
|---|---|---|
| id | bigint | auto identity PK |
| event_key | text | `whispers-2026-10-10` |
| guest_id | text | equals ticket_token if no token passed |
| guest_name | text | written by guest |
| status | text | `attending` or `declined` |
| plus_one_name | text | nullable |
| plus_one_email | text | nullable |
| seal_code | text | WSP·10·XXXX |
| ticket_token | text | unique, URL-safe |
| checked_in_at | timestamptz | null until door scan |
| submitted_at | timestamptz | auto |

Unique constraints: `(event_key, guest_id)`, `ticket_token`, `(event_key, lower(plus_one_email))`

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#0B0908` |
| Panel | `#12100E` |
| Gold | `#D9AE78` |
| Gold dim | `#8B6F4C` (mobile override: `#C79862`) |
| Crimson | `#A31621` |
| Bone | `#EDE6DA` (mobile override: `#F4EEE5`) |
| Muted | `#8C8176` (mobile override: `#C2B8AD`) |

- **Serif:** Cormorant Garamond 300
- **Sans:** Jost 300, uppercase, 0.3em letter-spacing
- Film grain overlay ~5.5% opacity, animated
- Vignette: radial gradient 30%–100% from center
- Dark only — no light mode

---

## Environment Variables (Cloudflare Pages)

| Variable | Where |
|---|---|
| `SUPABASE_URL` | Cloudflare Pages → Settings → Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | Same — rotate if exposed |

---

## Outstanding / TODO

- [ ] Token URL edge cases (see above)
- [ ] Cap enforcement: when rsvps count reaches 150, show waiting-list state
- [ ] Video file: client to supply MP4/WebM, 9:16 portrait, under 8MB
- [ ] Domain: no custom domain — using whispers-invite.pages.dev
- [ ] T–7 response deadline enforcement (Oct 3)
- [ ] T–3 reminder (client to send manually or via Luma)
- [ ] Address blast email (18:00 Oct 9) — out of scope for this build
