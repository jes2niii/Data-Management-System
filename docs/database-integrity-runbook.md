# Database and file integrity preflight

**Status:** Read-only tooling and restore procedure prepared. No application or staging database has been inspected and no backup or restore has been performed. This phase adds no migrations or data-repair routines.

New survey and exam submissions are validated against their own form or exam and written atomically. Duplicate answers are rejected per response or student. Survey ratings must fit the configured scale; Yes/No accepts `1` or `0` when scored. Exam blanks no longer count as correct. Affected tables: `survey_responses`, `survey_answers`, `test_students`, and `test_answers`. Historical results were not recalculated, and edit/delete retention rules still require a separate change.

## Run against an authorized copy

1. Use a recent, access-controlled staging clone with a **different database name** from the application database and a dedicated MySQL account with `SELECT` only. Do not use production credentials or give the audit account write, administrative, or file privileges.
2. Supply `DMS_AUDIT_DB_HOST`, `DMS_AUDIT_DB_PORT`, `DMS_AUDIT_DB_DATABASE`, `DMS_AUDIT_DB_USERNAME`, and `DMS_AUDIT_DB_PASSWORD` via a protected environment. Use an isolated runner and trusted connection. If Laravel configuration is cached, run from an isolated checkout with the intended staging configuration; do not clear a live app’s cache.
3. From `backend/`, run the preflight. Omit **both** copy options for a database-only run, or supply the absolute paths of the copied `storage/app/public` and `storage/app/private` roots:

   ```text
   php artisan dms:integrity-preflight --staging-database=dms_staging_copy --public-copy="<absolute-public-snapshot-root>" --private-copy="<absolute-private-snapshot-root>"
   ```

The command uses a separate connection and a MySQL read-only repeatable-read transaction. It emits aggregate counts only, not row IDs, credentials, or file paths. It refuses the configured application database name and application storage directories. The operator must still verify the host, account grants, and storage snapshot identity. Run long scans on an idle clone; a large file inventory can keep the read-only transaction open.

| Status / exit code | Meaning |
|---|---|
| `ok` / `0` | The requested checks completed with no flagged counts. If the copy options were omitted, files were not checked. |
| `review` / `1` | At least one count needs interpretation. A legacy public reference or two billings on one date does not, by itself, prove incorrect data. |
| `skipped: schema missing` / `2` | At least one check could not run. Exit `2` also covers invalid configuration or a failed scan. A skipped check is not a pass. |

The database checks cover attendance keys and sessions; training references; survey/test parent relationships and duplicate answers; document access references; inventory batch balances; and subscription billing date collisions. File checks count **database references**, including soft-deleted records: public copies, missing files, invalid or unreadable paths, and documents present on both disks. This is not an inventory of unreferenced files, a content safety scan, or a checksum comparison.

## Backup and isolated restore rehearsal

Before a cutover, agree on recovery time, recovery point, permitted downtime, and who can approve rollback. Use a maintenance window or coordinated snapshots so the database and file trees represent the same point in time. Record timestamp, schema revision, server version, and backup scope.

1. **Capture:** Use the organization’s verified MySQL backup process for the database and copy both storage roots, preserving paths and permissions. Use an encrypted backup location with restricted access; store the app key and infrastructure secrets separately under approved key-management controls. If using a logical InnoDB dump, use `--single-transaction` and avoid concurrent DDL; verify the dump tool’s exit status. Keep checksum manifests for the dump and file copies.
2. **Restore only to a newly provisioned, empty rehearsal target:** Verify the destination host and database name with the operator before importing. Keep it network-isolated, with email, background integrations, and production credentials disabled. Do not import over an existing database or use restore to test in production.
3. **Verify:** Check dump and file checksums, schema revision, row counts, key relationships, file presence, and file readability. Run the preflight with a SELECT-only rehearsal account. With approved test accounts, verify authorized downloads, denied direct public access for migrated files, scoped searches, and representative CRUD and reports.
4. **Record:** Keep the validation results, restore time, unresolved discrepancies, and whether the recovery objectives were met. A backup is not accepted until the restore and checks have passed. Leave backup retention and cleanup to the approved policy.

## Decisions before making changes

| Area | Proposed next action after verifying the copy |
|---|---|
| `attendances` | Decide what a null session means, reconcile duplicate or overlapping records with the owner, then design an enforceable unique key. Test MySQL’s handling of nulls and concurrent batch saves. |
| `trainings`, `training_monitorings`, `training_details` | Review orphan and mismatch counts. Confirm historical snapshots should be preserved before adding referential constraints. |
| `inventory_items`, `inventory_batches`, `inventory_transactions` | Decide how to represent legacy opening balances. Make stock changes atomic with row locking, deterministic FIFO order, and exact decimal rounding; reconcile discrepancies without rewriting historical transactions automatically. |
| `subscription_billings`, surveys, tests | Confirm legitimately repeated events and retention rules before introducing uniqueness or idempotency constraints. Prevent cross-parent writes and preserve answer history. |
| Sensitive file storage | Classify each file type; copy to private storage without deleting the source; verify checksums and record-to-file matching; update consumers; verify every ingress denies direct access before retiring the public route. Obtain separate approval before deleting any legacy files. |
| Indexes and delete rules | Review `SHOW INDEX`, foreign keys, and `EXPLAIN` on representative staging queries. Propose only measured indexes and review cascade changes with data owners. |

Do not treat a zero-count report as approval to apply a migration, rewrite records, or delete files.
