import { hashPassword, makeTemporaryPassword, validateStaffUsername } from "../functions/_shared/staff-auth.js";

const username = validateStaffUsername(process.argv[2]);

if (!username) {
  console.error("Usage: npm run staff:bootstrap-owner -- <username>");
  console.error("Username must be 3-40 chars: lowercase letters, numbers, dot, underscore or dash.");
  process.exit(1);
}

const temporaryPassword = makeTemporaryPassword();
const passwordHash = await hashPassword(temporaryPassword);

const sql = `
insert into public.staff_users (username, role, password_hash, active)
values ('${escapeSql(username)}', 'owner', '${escapeSql(passwordHash)}', true)
on conflict ((lower(username))) do update
set role = 'owner',
    password_hash = excluded.password_hash,
    active = true,
    failed_login_count = 0,
    locked_until = null,
    updated_at = now();
`.trim();

console.log("Run this SQL in Supabase SQL editor after sql/2026-09-30-staff-auth.sql:");
console.log("");
console.log(sql);
console.log("");
console.log("Temporary password, shown once:");
console.log(temporaryPassword);
console.log("");
console.log("After the first successful login, create/reset all other staff users from the Staff tab.");

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}
