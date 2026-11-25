# QA and release readiness

## Checks

| Check | How to run | Coverage |
|---|---|---|
| Backend regression tests | In `backend/`, run `php vendor/bin/phpunit --do-not-cache-result` | SQLite memory fixtures for permissions, private document uploads, role and credential safeguards, survey/exam integrity, profile/forms/report API workflows, and integrity and performance tooling. |
| Frontend regression tests | In `frontend/`, run `npm ci` and `npm test` | Shared navigation rules and profile/password validation through the actual React Hook Form resolver. |
| Frontend static checks | In `frontend/`, run `npm run lint` and `npm run build` | Lint and production bundling; neither proves browser behavior. |
| Dependency advisories | `composer audit --locked --no-interaction` in `backend/`; `npm audit --audit-level=high` in `frontend/` | Advisory snapshot for the locked dependency tree. A clean result is not a security certification. |
| MySQL schema and API checks | Job **Fresh MySQL schema and API checks** in [Quality checks](../.github/workflows/quality.yml) | Run all migrations against a new MySQL 8.0 container on the CI runner, then run `ContainmentTest` with transaction rollback between tests. Does not seed or use an external database. This is not an upgrade test against production-shaped data. |

The workflow runs on pushes, pull requests, and manual dispatch. It uses read-only repository permissions and requires no deployment secrets. The MySQL service receives random runner-local credentials, listens on loopback, and is stopped after the job. `DMS_CI_MYSQL` is reserved for that workflow; never point it at a developer, staging, or production database. Do not treat the new CI workflow as passing until it has actually run.

## Latest local verification

- PHP 8.2 / Laravel 12.73.0: **46 tests, 438 assertions**; Composer platform requirements passed.
- Node 24: **9 tests passed**; production build passed; lint passed with **64 warnings** (each is a pre-existing unused-variable or Fast Refresh warning; no errors).
- The second-level audit regressions are covered in `ContainmentTest`: partial attendance saves, locked survey/exam structures, safe file replacement, account status and department disclosures, batch/ledger consistency, per-cycle renewals, training course/package consistency, export filters and formula neutralization, folder cycles, document locks, bill payment dates, persisted exam group membership, accurate activity-log module/action/description reporting with before/after values, the simplified quick item analysis sharing the detailed analysis scoring rules, and permission-driven dashboard sections for every role.
- The initial advisory scans flagged both lockfiles. Targeted Composer updates kept Laravel on 12.x. Frontend updates included Axios, Vite and its affected transitive dependencies, and Zod 4. The profile validation tests exercise the Zod 4 resolver; repeat browser checks for the other form dialogs before release. Both final audit commands reported no advisories.
- Workflow YAML parsed locally. GitHub Actions and the disposable MySQL job were not executed here; Docker was unavailable. No application database was accessed.

## Before production rollout

- Require green CI results and review the remaining lint warnings. Verify `.env`, application key management, and the actual Compose build, ingress, proxy, and workers on staging.
- Review role and permission mappings, including `items.*`, between the staged database and the [containment rollout notes](containment-rollout.md).
- Run the [read-only integrity preflight and restore rehearsal](database-integrity-runbook.md) on an approved copy. Test both upgrades from the deployed migration revision and recovery. Do not substitute the fresh CI schema for this step.
- Verify critical browser workflows on staging: sign-in and revocation, ordinary and read-only access, uploads and downloads, forms and profile updates, CSV download and print, and keyboard and mobile navigation.
- Verify the sensitive legacy file cutover at every active ingress. New private document storage does not revoke direct links to files already served publicly.
- Gather the [performance baseline](performance-baseline.md) before proposing indexes or caching.

Do not deploy, migrate or clean existing records, rotate live credentials, or move legacy files as part of running the automated tests.
