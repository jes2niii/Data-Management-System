# DMS containment batch

Status: code and isolated feature tests only. No deployment, live database changes, or legacy file moves.

## Permission and API changes

| Area | New enforcement |
|---|---|
| Users and roles | An operator cannot manage an account or role whose permissions exceed their own, or grant permissions they do not hold. Only Super Admin can assign the reserved system role or manage its users. The final enabled Super Admin cannot be disabled, deleted, or reassigned. Roles and departments with dependent records cannot be hard-deleted through the API. |
| Documents | `/api/files` and `/api/documents` retain the same routes. Reads require `documents.read` and record visibility. Writes also require their action permission: update for comments, favorites, locking, versions, shares, moves and archive; approve for approving/rejecting; delete for trash/restore. Explicit user/department restrictions require valid targets. Existing share records do not create new visibility grants in this batch. |
| Alternate data surfaces | Search omits modules the caller cannot read. Dashboard sections and document aggregates respect module and document visibility. Reports require both the report and the relevant source module permission. Folder document counts and lists use the same visibility as the document API. |
| Other modules | Attendance uses `employees.*` (batch writes require both create and update). Supply chain uses `inventory.*`; category and supplier writes use their own action permissions. Training, books, surveys, and test analysis have explicit action checks. Survey submissions require `items.read`; response lists and survey analyses require `items.update`. |
| Settings | The web reset endpoint always denies authorized callers; no reset UI remains. SMTP passwords are write-only and are encrypted when saved or replaced. Blank SMTP password fields preserve the stored value. |
| Auth | Sanctum remains in use. Login is throttled and bearer credentials expire after `SANCTUM_TOKEN_TTL_MINUTES` (default 720); older tokens already beyond the new age limit will require sign-in. Disabled accounts cannot use authenticated business routes. Disabling, deleting, reassigning, or changing credentials revokes affected tokens. Admin password reset requires a supplied password and never returns it. |

Review effective role grants before rollout. `items.*` is included in the fresh-install seeder, not automatically applied to an existing database. Provision missing permission records and approved grants separately; do not rerun demo or bootstrap seeding against an existing deployment.

## Data and file handling

- Affected tables include `users`, `roles`, `permissions`, `role_permission`, `personal_access_tokens`, `documents`, `document_access`, `document_versions`, and `settings`. No schema migration was added.
- New document uploads and versions go to `storage/app/private/documents`. The API can still read existing files in the public disk. The client uses authenticated preview and download requests. Preview is limited to selected raster images, PDF, and plain text.
- **Legacy files are not secured by this change alone.** Existing public document URLs—and public employee attachments, bill attachments, forms, and books—must be treated as potentially exposed. For each module, inventory clients and files, make a verified copy, confirm authorized access and denied direct requests at every ingress, then retire public serving with separate approval. Do not delete source files during the copy.
- If any SMTP secret was set before this change, rotate it and save the replacement. Legacy stored values are masked but are not automatically rewritten. Keep `APP_KEY` stable and protected; include appropriate key management in the backup and restore plan.
- Compose now requires distinct database secrets and no longer publishes MySQL by default. On an existing MySQL volume, configuration changes alone do **not** rotate existing MySQL accounts. Existing deployments must coordinate credential rotation separately. The Compose build/ingress issues from the audit are not closed by this batch.

## Verification and next gate

Run `php vendor/bin/phpunit --do-not-cache-result` from `backend`, and `npm run lint` and `npm run build` from `frontend`. Containment tests explicitly create their schema in SQLite memory and use fake file disks. The full historical migration chain does not run on the installed SQLite version because the forms normalization drops an indexed column; verify upgrades and analytics on disposable MySQL. Browser UX and any actual MySQL or Docker deployment still require staging verification.

Next: follow the [database and file integrity runbook](database-integrity-runbook.md) on an approved staging copy. Back up both rows and files and verify an isolated restore before applying migrations, cleaning data, or disabling legacy public file delivery.
