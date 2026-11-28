# CashBook Architecture & Engineering Documentation Hub

Welcome to the central documentation and engineering study hub for **CashBook** — an offline-first, multi-tenant financial ledger Progressive Web Application (PWA) architected for **PC and Android** with **10–15 years of scale**.

---

## 🧭 Documentation Map & Reading Guide

This directory is organized into four distinct, non-overlapping pillars:

```
docs/
├── README.md                                 # ← You are here: Master index & reading guide
├── project_scope_and_tech_stack.md           # Business scope, platforms, 10–15 year tech stack rationale
├── data_interfaces_and_api_endpoints.md      # Canonical TypeScript models, compound DB indexes, REST routes
├── DOCUMENTATION_STANDARDS.md                # Rules for continuous updates, "where/what/how to write" for AI/engineers
├── notes/                                    # Step-by-step engineering build notebook & study modules
│   ├── README.md                             # Master study modules table of contents
│   ├── 01-project-setup-and-tech-stack.md    # Scaffolding, dependency rationale, folder architecture
│   ├── 02-database-schema-and-drizzle.md     # Integer paisa, compound partitioning indexes, tombstones
│   ├── 03-authentication-better-auth.md     # Better Auth, Google OAuth, session guards, tenant isolation
│   ├── 04-rest-api-and-rbac.md               # Route handlers, cold vs delta sync, RBAC permission matrix
│   ├── 05-offline-first-dexie-and-sync.md    # Dexie IndexedDB, WebP photo Blobs, background sync queue
│   ├── 06-external-services-guide.md         # Neon DB, Cloudflare R2 ($0 egress), Google, Resend setup
│   ├── 07-clean-fintech-ui-and-tactile-system.md # White fintech theme, 48x48px hit-slop, tri-state skeletons
│   └── 08-system-design-and-interview-prep.md   # Domain fundamentals, build blueprint, top 10 interview Q&A
└── postman/
    ├── cashbook.postman_collection.json      # Machine-executable Postman Collection v2.1.0
    └── README.md                             # Human-readable API documentation with request/response payloads
```

---

## 🎯 Recommended Reading Order

### Path A: For Developers Building or Extending the Codebase
1. **[Scope & Tech Stack](./project_scope_and_tech_stack.md)**: Understand the business domain, multi-tenant boundaries, and why technologies were selected.
2. **[Data Interfaces & Endpoints](./data_interfaces_and_api_endpoints.md)**: Review canonical database schemas, TypeScript interfaces, and REST API contracts.
3. **[Build Notebook (Notes 01–07)](./notes/README.md)**: Follow the step-by-step implementation order from initial scaffolding to tactile UI.
4. **[Documentation Standards](./DOCUMENTATION_STANDARDS.md)**: Review continuous synchronization and coding guardrails.

### Path B: For Technical Interview Preparation & Architecture Study
1. **[08. System Design & Interview Guide](./notes/08-system-design-and-interview-prep.md)**: Master the 7 core architectural pillars, trade-offs, and top 10 senior full-stack interview questions.
2. **[02. Database Schema & Minor Units](./notes/02-database-schema-and-drizzle.md)**: Deep dive into IEEE 754 precision risks and compound partitioning.
3. **[05. Offline Engine & Sync](./notes/05-offline-first-dexie-and-sync.md)**: Study distributed delta sync, soft-delete tombstones, and IndexedDB binary Blobs.
4. **[07. Tactile UI & Mobile Ergonomics](./notes/07-clean-fintech-ui-and-tactile-system.md)**: Understand 48x48px native hit-slop and tri-state skeleton lifecycles.

---

## 🛡️ Non-Negotiable Architectural Guardrails

Every contribution, pull request, or AI modification must strictly adhere to these 6 golden rules:

1. **Integer Minor Units**: All monetary values are stored strictly as integer paisa/cents (`amountPaisa: integer`). Floats are never stored in the database.
2. **Strict Multi-Tenancy**: Every database query, IndexedDB table, and Cloudflare R2 storage key must be scoped by `orgId` and guarded by `requireOrgMember(orgId, role?)`.
3. **Preserved History & Tombstones**: Books with `logCount > 0` are never hard-deleted. Soft-archives (`isArchived`) and soft-delete tombstones (`deletedAt`) protect financial auditability.
4. **Local-First 0ms UX**: UI components render instantly from Dexie IndexedDB cache (`localDb`) and sync in the background.
5. **Mobile Touch Target Standard**: All interactive touch targets must satisfy the 48x48 physical pixel rule via CSS hit-slop (`before:-inset-2`).
6. **Zero-Prompt Documentation Sync**: Postman collections, READMEs, data interfaces, and notes must be synchronized continuously with every code change.
