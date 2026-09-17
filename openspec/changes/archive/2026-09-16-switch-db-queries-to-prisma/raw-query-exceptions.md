# Typed Prisma raw-query exceptions

The remaining raw SQL uses Prisma's `$queryRaw` or `$queryRawUnsafe` with explicit result types. These queries remain SQL because the legacy MySQL implementation relies on date functions, CTEs, grouped report aggregates, or multi-join projections that would otherwise change response semantics.

- Monthly count/report routes: MySQL `YEAR`, `QUARTER`, `STR_TO_DATE`, and BigInt aggregate normalization.
- `getBatchesWithEnrollCount`, `getCoursesWithEnrollCount`, and `getYearlyEnrollmentTrend`: grouped dashboard aggregates.
- `getbatchdetails`: five legacy multi-join projections used to preserve the existing response contract.
- `getdocumentsfee`: the document-field projection must tolerate legacy empty strings that cannot be decoded as the current `YesNo` Prisma enum.
- `getbatchesdata`, `getbatchesreport`, and `getstudentsdata`: complex CTE/report projections with role filters and grouped financial/attendance metrics.

All request-derived values are passed as bound parameters. The dynamic fragments in `getBatchesWithEnrollCount` are selected from fixed application branches, not request-provided identifiers. No generic database helper remains.
