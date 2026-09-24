WHISPERS — shared-link prototype / deployment package

WHAT CHANGED
- One shared invitation URL; no prefilled guest name.
- Guest writes their own first and last name. There is no public guest-list picker.
- RSVP can be accepted or declined.
- Plus-one is optional and asks for full name + email only when enabled.
- Final confirmation builds a seal code and a real QR ticket.
- Each confirmed guest gets a private ticket URL at /ticket/{token}.
- Door staff can scan tickets from /staff/rose-door-10 and see recent scanned guests.
- RSVP payload is POSTed to /api/rsvp.
- Mobile typography/contrast were increased substantially, including 320px layouts.

PRODUCTION SETUP
1. Create a Supabase project.
2. Run sql/schema.sql in the Supabase SQL editor.
3. If the old schema already exists, run sql/2026-09-24-door-scanner.sql in the Supabase SQL editor.
4. Deploy this folder to Cloudflare Pages.
5. Add Cloudflare Pages environment variables:
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
6. Use the free pages.dev URL first. Point a custom domain only after final approval.

DATA RECEIVED
/api/rsvp receives: event, guestName, status, plusOne{name,email}|null, sealCode, submittedAt.
The server stores it in rsvps, creates ticket_token, and returns ticketUrl + checkInUrl.

LINKS
- Guest invitation: https://whispers-invite.pages.dev/ or the current Cloudflare preview URL.
- Private guest ticket: /ticket/{token}; generated after RSVP.
- Door scanner: /staff/rose-door-10. Keep this link only for selected staff.

NOTE
The standalone prototype works without a backend by falling back to localStorage. That fallback is only for UX testing; deployed production should have the API configured.
