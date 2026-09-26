import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const RSVP_COLUMNS = [
  "id",
  "guest_name",
  "guest_email",
  "guest_phone",
  "status",
  "submitted_at",
  "wants_table_reservation",
  "ticket_email_sent_at",
  "checked_in_at",
  "plus_one_name",
  "plus_one_email",
  "plus_one_phone",
  "plus_one_email_is_fallback",
  "plus_one_checked_in_at",
  "staff_table_assignments(staff_tables(label))",
].join(",");

export async function onRequestGet({ env }) {
  const rsvps = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${RSVP_COLUMNS}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&order=submitted_at.desc&limit=1000`
  );
  if (rsvps.error) return rsvps.error;
  if (!rsvps.response.ok) return json({ error: "Could not load members" }, 502);

  const companions = await supabaseFetch(
    env,
    "/rest/v1/rsvp_companions?select=id,rsvp_id,guest_name,email,email_is_fallback,phone,ticket_email_sent_at,checked_in_at,rsvps!inner(guest_name,event_key,status,submitted_at,wants_table_reservation)&order=created_at.desc&limit=1000"
  );
  if (companions.error) return companions.error;
  if (!companions.response.ok) return json({ error: "Could not load members" }, 502);

  const rows = await rsvps.response.json();
  const companionRows = (await companions.response.json()).filter((row) => {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    return parent?.event_key === EVENT_KEY;
  });

  const members = [];
  for (const row of rows) {
    const table = tableLabel(row);
    members.push({
      id: `guest:${row.id}`,
      rsvpId: row.id,
      holder: "guest",
      name: row.guest_name,
      type: "Guest",
      guestOf: null,
      email: row.guest_email || "",
      phone: row.guest_phone || "",
      status: row.status,
      wantsTableReservation: row.wants_table_reservation === true,
      table,
      ticketEmailSentAt: row.ticket_email_sent_at || null,
      checkedIn: Boolean(row.checked_in_at),
      checkedInAt: row.checked_in_at || null,
      submittedAt: row.submitted_at || null,
    });
    if (row.plus_one_name) {
      members.push({
        id: `plus_one:${row.id}`,
        rsvpId: row.id,
        holder: "plus_one",
        name: row.plus_one_name,
        type: "Plus-one",
        guestOf: row.guest_name,
        email: row.plus_one_email || row.guest_email || "",
        emailIsFallback: row.plus_one_email_is_fallback === true,
        phone: row.plus_one_phone || "",
        status: row.status,
        wantsTableReservation: row.wants_table_reservation === true,
        table,
        ticketEmailSentAt: null,
        checkedIn: Boolean(row.plus_one_checked_in_at),
        checkedInAt: row.plus_one_checked_in_at || null,
        submittedAt: row.submitted_at || null,
      });
    }
  }

  for (const row of companionRows) {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    members.push({
      id: `companion:${row.id}`,
      rsvpId: row.rsvp_id,
      companionId: row.id,
      holder: "companion",
      name: row.guest_name,
      type: "Added guest",
      guestOf: parent?.guest_name || "",
      email: row.email || "",
      emailIsFallback: row.email_is_fallback === true,
      phone: row.phone || "",
      status: parent?.status || "",
      wantsTableReservation: parent?.wants_table_reservation === true,
      table: "",
      ticketEmailSentAt: row.ticket_email_sent_at || null,
      checkedIn: Boolean(row.checked_in_at),
      checkedInAt: row.checked_in_at || null,
      submittedAt: parent?.submitted_at || null,
    });
  }

  return json({ ok: true, members });
}

function tableLabel(row) {
  const assignment = Array.isArray(row.staff_table_assignments) ? row.staff_table_assignments[0] : row.staff_table_assignments;
  const table = Array.isArray(assignment?.staff_tables) ? assignment.staff_tables[0] : assignment?.staff_tables;
  return table?.label || "";
}

export async function onRequest() {
  return methodNotAllowed();
}
