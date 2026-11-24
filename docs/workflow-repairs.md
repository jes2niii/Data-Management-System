# Workflow repairs

## Profile and password

- The client uses `PUT /api/profile` for profile and password changes. Photo uploads use a multipart `POST` to `/api/profile` with `_method=PUT`, so PHP can parse the file while Laravel dispatches to the existing update route.
- Successful profile changes refresh the current React authentication state. Account details are fetched from `/api/me` on app load, not cached in browser storage. Clearing a phone field sends `null`. The photo picker enforces the upload size and releases preview object URLs.
- Password changes require `current_password`, `password`, and `password_confirmation`. The server verifies the current password, enforces the new password length, and revokes bearer tokens. The client clears its session and returns to login without trying to revoke an already-invalid token.
- Isolated API tests cover JSON and multipart updates, invalid current passwords, the byte-size limit, and token revocation. Browser workflows require an approved test environment.

## Forms repository

- The client downloads via authenticated `GET /api/forms/{id}/download` rather than opening a raw file URL and sending a second tracking request. The server increments the count once when preparing an available file response; this is not a receipt that proves the user completed the transfer.
- Category filters now send real category IDs, category updates accept `form_category_id`, and the list exposes stable pagination. The API limits `per_page` to 100 and tests cover the second page, category edits, successful downloads, and missing files.
- This does not move existing forms or close direct public storage access. That remains part of the storage cutover.

## Reports

- The client downloads `GET /api/reports/export/{type}/csv` for `employee`, `document`, `bill`, and `activity`. Existing JSON exports use the same route with `/json`; XLSX and server-generated PDF are not supported. CSV can be opened in spreadsheet software, and users can use the browser’s Print dialog to save the visible report as PDF.
- CSV export and the report views share authorization and query filters. Document visibility applies to both. Date filters support either boundary independently and include the entire end day. Employees use status and department filters; bills have their own status selection.
- CSV streams rows in batches, uses an explicit column list, and neutralizes spreadsheet formula prefixes in text fields. The activity CSV includes all matching entries; the existing on-screen/JSON activity preview remains limited to 200 recent entries.
- Isolated tests cover all four CSV types, document visibility, date boundaries, invalid inputs, CSV quoting, and JSON compatibility. Browser download, print layout, and large-dataset timing remain unverified.

## Navigation and responsive checks

- Sidebar links and direct module routes share access rules. Restricted routes display an access-denied message without mounting the module. Reports also require a source-module read permission. Settings tabs are checked separately; accounts without system-settings access default to local Personalization.
- A saved session is checked against `/api/me` before routing, ignoring any previously cached role. Network failures offer a retry. A disabled or expired session returns to sign-in. This changes the frontend bootstrap, not the Sanctum authentication mechanism.
- The mobile navigation is a labelled dialog that traps focus, closes on Escape or navigation, and restores focus to the opener. The desktop collapsed sidebar retains accessible names and expands when a menu group is opened.
- Chromium smoke checks used a loopback-only fixture API and a read-only forms account. They covered sign-in redirection without a session, denial of Users and SMTP settings despite stale cached permissions, the forms page at 390 px and 820 px without page-level horizontal overflow, and drawer dismissal by Escape or link activation. These are not staging or production end-to-end tests.

Next: use the [performance baseline runbook](performance-baseline.md) to measure dashboard and reporting queries on an approved MySQL staging copy. Backup restore rehearsal and legacy file cutover also remain staging tasks.
