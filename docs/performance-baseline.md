# Dashboard and report performance baseline

## Measured locally

The dashboard inventory section previously issued **8 inventory-table queries** for the tested request: five totals, category totals, status totals, and low-stock rows. Combining the five totals into one SQL aggregate reduced the fixture request to **4 inventory-table queries**. The regression test checks totals, stock status counts, and exclusion of soft-deleted rows. The fixture uses SQLite and no related category for the low-stock rows; related-record lookups and other dashboard modules are not included in the count. This is a query-count improvement, not a measured production latency or memory improvement.

## Collect measurements on staging

1. Use an approved MySQL staging copy with representative record volumes and approved test accounts. Keep it isolated from live integrations. Start with the [integrity and restore runbook](database-integrity-runbook.md).
2. Set `APP_ENV=staging` and `DMS_PROFILE_REPORTS=true` on the staging app only, then reload its configuration through the normal deployment process. Do not turn on debug mode or SQL query logging.
3. Exercise Dashboard, report lists, and report exports with a full-access test account and with limited roles. Record each filter set and role separately. Include small and large representative date ranges, repeat runs after warming up, and collect request latency and transfer size at the client.
4. Retrieve the `dms.performance` events from the configured Laravel log channel. Compare median and p95 application time, DB time, query count, and buffered response bytes using the same dataset, role, and filters. Bulk CSV streams report `response_bytes: null`; measure transfer size at the client instead. Only compare streams with `completed: true`. The route template groups exports together, so benchmark each report separately or correlate runs by time rather than adding sensitive URL fields to logs.
5. For slow queries, review the actual indexes and collect `EXPLAIN` plans with authorized representative inputs. Compare rows examined and lock behavior before proposing any indexes. No indexing, caching, or production tuning is implied by enabling the profiler. Turn it off afterward and retain results according to the staging log policy.

Metrics include only the route template, HTTP status, application time, aggregate database time and query count, buffered response size, and stream completion. Application time is measured inside the request pipeline, not end-to-end network time. SQL, bindings, filter values, identities, and report contents are not recorded. Profiler tests run against isolated fixtures; MySQL measurements are still pending.
