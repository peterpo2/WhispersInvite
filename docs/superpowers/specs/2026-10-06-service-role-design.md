# Service Role Design

## Goal

Add a `service` staff role for event service personnel. An owner creates a normal admin account, then changes its role to `service` from the Staff page.

## Access Model

The role hierarchy is:

1. `owner`: all staff views and actions.
2. `admin`: the existing admin views and actions.
3. `door`: the existing operational views and actions.
4. `service`: only read-only access to Tables.

A service user may open the staff application, log out, refresh the current data, select a table, and inspect assigned or unassigned guest groups. The user must not see Scanner, Members, Invite, Menu, Staff, or any export controls.

## Read-Only Tables

The Tables view for `service` displays table labels, capacity, seats used, assigned groups, their people, reservation-request status, confirmation status, and unassigned groups. It does not render controls that mutate data:

- no Add or Remove buttons;
- no table-assignment dropdowns;
- no reservation confirmation checkboxes;
- no add-to-table search panel;
- no CSV export.

The server enforces the same boundary. `service` may call only the tables read endpoint and the minimum session endpoints needed to render and leave the staff application. Table assignment and reservation mutation endpoints continue to require `door` or a higher role.

## Staff Management

The owner-only Staff page adds `service` to the role selector in both the main and fallback scripts. Account creation remains `Create Admin`; the owner changes the new account to `service` and saves it. Existing self-protection rules for the active owner remain unchanged.

## Database

Add `service` to the `staff_users.role` check constraint in `sql/schema.sql` and in a new idempotent dated migration. Existing users and sessions are preserved. Because sessions load the current staff row on every authenticated request, a saved role change takes effect on the next request or page reload.

## Verification

Tests must cover:

- `service` as a valid role and the lowest permission level;
- staff shell, logout, session identity, and table reads for `service`;
- rejection of service access to all mutation and non-table APIs;
- only the Tables tab being available;
- absence of all mutation and export controls in the service Tables view;
- schema and migration support for the new role;
- unchanged access for owner, admin, and door.

Run the full Node test suite and manually verify the service Tables view at desktop and mobile widths before deployment.
