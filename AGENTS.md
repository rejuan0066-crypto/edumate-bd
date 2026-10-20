# Architecture rules

- Attendance lists must use persisted date-scoped records without hardcoded date exclusions or automatic deletion on page load, so visible attendance agrees with duplicate detection.
- Bulk marking inserts only missing date/person/shift records using the shared conflict options, so concurrent marking preserves existing attendance.
- Single attendance saves resolve persisted IDs using the exact date/person/shift key rather than optimistic cache IDs, so edits target real records.