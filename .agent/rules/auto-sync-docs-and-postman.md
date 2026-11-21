---
description: Automatically synchronize API documentation, notes, and Postman collections on every codebase update
globs: ["src/app/api/**/*", "src/db/schema/**/*", "src/lib/**/*"]
always_on: true
---

# Auto-Sync Documentation, Notes & Postman Collection

Whenever any API endpoint (`src/app/api/...`), database schema (`src/db/schema/...`), or core service (`src/lib/...`) is created, edited, or deleted:

1. **Postman Collection (`postman/cashbook.postman_collection.json`):**
   - Automatically update the collection with accurate HTTP methods, paths, headers (e.g. `Idempotency-Key`), request body schemas, and response examples.

2. **Human-Readable API Catalog (`postman/README.md`):**
   - Keep markdown documentation up-to-date with complete request/response examples and RBAC permissions.

3. **Architecture Docs (`docs/` and `docs/notes/`):**
   - Keep `docs/data_interfaces_and_api_endpoints.md` and related notes in `docs/notes/` aligned with current code implementation.

This rule executes proactively on every turn without requiring user reminders.
