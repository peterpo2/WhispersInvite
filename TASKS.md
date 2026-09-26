# WHISPERS: tasks

Event: Saturday 10 October 2026, doors 22:00 · Live: https://whispers-invite.pages.dev
Door scanner: https://whispers-invite.pages.dev/staff/rose-door-10 (share only with door staff)
All SQL you may need: [`sql/useful-queries.sql`](sql/useful-queries.sql)

## Before sending invitations
- [ ] Test on a real iPhone/Safari: open a `/hi/<id>` link, register with contact details,
      add +1, request a table, confirm that no QR/code/location is revealed before release.
- [ ] Test on a modern Android/Samsung Chrome device for the same registration and locked-ticket
      flow.
- [ ] Delete the test RSVPs (`sql/useful-queries.sql`, section 11).
- [ ] Replace the test guests with the real list and copy each guest's link (sections 10 and 2).

## When the venue is confirmed
- [ ] Set the venue (section 9). Tickets show it at 18:00 on the 9th, or straight away if you
      set `reveal_at = now()`. No deploy needed.

## Door night
- Headcount: section 1. Inside / still to arrive: section 7. Undo a wrong scan: section 8.
- Scanner: hold the QR 20–40 cm away; tap the picture to refocus; **Switch** cycles the back cameras
  if the picture stays blurry.

## Still open (development)
- [ ] Intro video from the client (the film screen shows text scenes until then).
- [ ] Cap at 150 people.
- [x] Enforce RSVP deadline: 07.10.2026 at 18:00 Europe/Sofia.
- [x] Confirm no cancellation/decline changes after deadline/release.
- [ ] Wire email delivery for registration confirmation and 09.10 ticket release.
- [ ] Add staff auth after domain/email are ready: username/password + email confirmation code.
- [x] Add a separate staff/admin reservation-confirmed toggle; table assignment alone is internal.
- [ ] Replace temporary 10-table model with final venue table scheme.

## Done
- [x] Repeat RSVP keeps an earlier +1 unless a different +1 is entered.
- [x] Invitation flow: seal, film, details, RSVP, plus-one, ticket, decline.
- [x] Personal links `/hi/<id>` (name on the seal); the plain link asks for a full name.
- [x] Cinematic full-screen design, new logo files, iPhone ring fix.
- [x] A repeat RSVP from the same link updates the reply and keeps the ticket.
- [x] Plus-one has their own ticket, seal code, QR and check-in.
- [x] **Private ticket** saves the ticket(s) to the phone.
- [x] Venue on tickets, controlled from `event_details`.
- [x] Door scanner: separate check-ins, "Already inside" warning, list of arrivals.
- [x] All migrations run on production (list at the top of `sql/useful-queries.sql`).
