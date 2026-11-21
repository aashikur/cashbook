# 🤖 Antigravity Agent Guidelines & Project Operating Rules

These rules are persistent and apply to all agent interactions across the **CashBook** workspace.

---

## 🔄 Rule: Continuous Documentation & Postman Synchronization (Mandatory)

Whenever any backend API route, database schema, library service, or business logic is added, modified, or refactored:

1. **Auto-Update Postman Collection:**
   - Immediately update [`postman/cashbook.postman_collection.json`](./postman/cashbook.postman_collection.json) to reflect the new or modified endpoints, request schemas, headers, query parameters, and example response payloads.
   - Maintain valid Postman Collection v2.1.0 schema format at all times.

2. **Auto-Update Human-Readable API Documentation:**
   - Update [`postman/README.md`](./postman/README.md) with clear endpoint tables, descriptions, request/response JSON snippets, and access permissions (`Admin` vs. `Viewer`).

3. **Auto-Update Architecture Docs & Notes:**
   - Update [`docs/data_interfaces_and_api_endpoints.md`](./docs/data_interfaces_and_api_endpoints.md) if models, types, or API signatures change.
   - Update relevant architecture notes in [`docs/notes/`](./docs/notes/) (e.g. `02-database-schema-and-drizzle.md`, `04-rest-api-and-rbac.md`, `05-offline-first-dexie-and-sync.md`, `06-external-services-guide.md`).

4. **Zero-Prompt Rule:**
   - **Do not wait for the user to request documentation updates.** Synchronizing docs and the Postman collection is a mandatory completion criterion for every code modification task.

---

## 🛡️ Coding & Architectural Standards

- **Strict Multi-Tenant Isolation:** Every database query and R2 key must be scoped by `orgId` and verified through `requireOrgMember(orgId, role?)`.
- **Integer Cents / Paisa:** Monetary figures are stored and processed strictly as integer paisa (`amountPaisa`, `totalSpent`) to eliminate floating-point drift.
- **Local-First / 0ms UX:** UI components must leverage Dexie IndexedDB cache (`localDb`) for instant 0ms rendering and use background SWR/Delta sync for server freshness.
- **Preserved History:** Ledgers with `logCount > 0` must never be hard-deleted; use soft-archive (`isArchived: true`) and soft-delete (`deletedAt: now()`).
