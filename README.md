# WHISPERS Invite

Private mobile-first invitation experience for the WHISPERS event.

The site is built for Cloudflare Pages and uses Supabase as the RSVP and check-in database. Guests open the public invitation link, enter their own name, confirm attendance, optionally add one guest, and receive a private ticket link with a QR code. Staff can use a separate scanner page to validate tickets at the door.

## Current Links

- Public invitation: `https://whispers-invite.pages.dev/`
- Current preview seen in testing: `https://9df6e77b.whispers-invite.pages.dev/`
- Staff scanner route after deploy: `/staff/rose-door-10`

## Guest Flow

1. Open the invitation.
2. Press and hold to break the seal.
3. View the event details.
4. Enter your own full name.
5. Choose whether to attend.
6. If attending, optionally add a plus-one name and email.
7. Confirm the RSVP.
8. Receive a private ticket link and QR code.

The ticket link is unique per RSVP. It opens a dedicated ticket page that shows the same QR code.

## Staff Flow

Staff open:

```text
/staff/rose-door-10
```

From there they can:

- open the device camera;
- scan a guest QR code;
- confirm the main guest and plus-one details;
- see whether the ticket was already checked in;
- view recent scanned entries.

This route is intentionally not linked from the public invitation. For stronger protection later, add Cloudflare Access or a password layer.

## Project Structure

```text
index.html                  Main invitation experience
functions/api/rsvp.js       Creates RSVP records and ticket tokens
functions/api/ticket.js     Returns ticket details by token
functions/api/checkin.js    Confirms scanned tickets
functions/api/door.js       Lists recent check-ins for staff
functions/ticket/[token].js Private ticket page
functions/staff/rose-door-10.js Staff scanner page
functions/_shared/          Shared Supabase and RSVP helpers
sql/schema.sql              Full database schema
sql/2026-09-24-door-scanner.sql Upgrade migration for existing database
test/                       Node test suite
```

## Supabase Setup

Required Cloudflare environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Never commit real values for these keys. Set them only inside Cloudflare Pages project settings.

For a fresh Supabase project, run:

```text
sql/schema.sql
```

For the existing WHISPERS database, run:

```text
sql/2026-09-24-door-scanner.sql
```

That migration adds the ticket token/check-in fields needed by the QR scanner flow.

## Local Checks

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Deploy manually to Cloudflare Pages:

```bash
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

## Security Notes

- Do not commit `.env`, `.dev.vars`, API tokens, Supabase keys, or Cloudflare credentials.
- `SUPABASE_SERVICE_ROLE_KEY` must only live in Cloudflare environment variables.
- The staff scanner link is private-by-link for now. Use Cloudflare Access before sharing it broadly.
- QR codes should be treated as tickets: anyone with the ticket URL can present it.

## Next Deployment Checklist

1. Apply the Supabase migration.
2. Set Cloudflare Pages environment variables.
3. Deploy the latest `main` branch.
4. Test the full mobile guest flow.
5. Test the ticket page and staff scanner on a real phone.
