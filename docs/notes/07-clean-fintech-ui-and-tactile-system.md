# 07. Clean Fintech UI Architecture & Tactile Feedback System

This guide outlines the front-end design philosophy, component architecture, and interaction standards implemented for the CashBook application to match the modern, white fintech mobile reference.

---

## 1. Visual Aesthetics & Design System Tokens

The application strictly avoids hardcoded hex values or hardcoded color utility classes across component files. All colors are defined as centralized CSS variables in `:root` and mapped directly into the Tailwind CSS v4 `@theme` block in [src/app/globals.css](file:///e:/WebDevs/Projects/cashbook/application/src/app/globals.css):

```css
@import "tailwindcss";

@theme {
  --color-canvas: var(--bg-base);
  --color-surface: var(--bg-surface);
  --color-subtle: var(--bg-subtle);
  --color-elevated: var(--bg-elevated);

  --color-txt-main: var(--text-primary);
  --color-txt-secondary: var(--text-secondary);
  --color-txt-muted: var(--text-muted);

  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);

  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-primary-border: var(--primary-border);

  --color-cash-in: var(--cash-in);
  --color-cash-in-hover: var(--cash-in-hover);
  --color-cash-in-light: var(--cash-in-light);
  --color-cash-in-border: var(--cash-in-border);

  --color-cash-out: var(--cash-out);
  --color-cash-out-hover: var(--cash-out-hover);
  --color-cash-out-light: var(--cash-out-light);
  --color-cash-out-border: var(--cash-out-border);
}

:root {
  /* ── Canvas & Surfaces ─────────────────────────────────────────────── */
  --bg-base: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-elevated: #ffffff;

  /* ── Typography Tokens ─────────────────────────────────────────────── */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  /* ── Borders & Dividers ────────────────────────────────────────────── */
  --border-subtle: #f1f5f9;
  --border-default: #e2e8f0;
  --border-strong: #cbd5e1;

  /* ── Brand Primary (Blue in Reference) ─────────────────────────────── */
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #eff6ff;
  --primary-border: #dbeafe;

  /* ── Financial Inflow (Green) ───────────────────────────────────────── */
  --cash-in: #16a34a;
  --cash-in-hover: #15803d;
  --cash-in-light: #f0fdf4;
  --cash-in-border: #bbf7d0;

  /* ── Financial Outflow (Red) ────────────────────────────────────────── */
  --cash-out: #dc2626;
  --cash-out-hover: #b91c1c;
  --cash-out-light: #fef2f2;
  --cash-out-border: #fecaca;
}
```

> [!TIP]
> **Single Source of Truth:** Changing any variable in `:root` inside `globals.css` immediately shifts the theme across every page, card, modal, button, and input without touching a single component file!

| Semantic Class | CSS Variable | Default Value | Usage |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `--bg-base` | `#F8FAFC` | Smooth, low-strain off-white body canvas |
| `bg-surface` | `--bg-surface` | `#FFFFFF` | Elevated cards, ledger list items, modals |
| `bg-subtle` | `--bg-subtle` | `#F1F5F9` | Text inputs, dropdown backgrounds, tracks |
| `text-txt-main` | `--text-primary` | `#0F172A` | Ledger titles, balances, headers |
| `text-txt-secondary` | `--text-secondary` | `#475569` | Subtitles, timestamps, auxiliary copy |
| `text-txt-muted` | `--text-muted` | `#94A3B8` | Placeholders, helper text, empty states |
| `border-border-default` | `--border-default` | `#E2E8F0` | Card borders, input borders, divider rules |
| `bg-primary`, `text-primary` | `--primary` | `#2563EB` | Active tabs, `+ Add New Book`, Total In badge |
| `bg-primary-light` | `--primary-light` | `#EFF6FF` | Book icon background boxes, badges |
| `bg-cash-in`, `text-cash-in` | `--cash-in` | `#16A34A` | Sticky `+ Cash In` action, inflow values |
| `bg-cash-out`, `text-cash-out` | `--cash-out` | `#DC2626` | Sticky `- Cash Out` action, outflow values |

---

## 2. Iconography Standard: Zero Emoji Policy

> [!IMPORTANT]
> **Strict Rule:** No native OS emojis (e.g. 📊, 💳, ⚙️, 💰) are permitted in code, JSX, or user-facing copy. 
> Native emojis render inconsistently across Windows, iOS, and Android and degrade the fintech enterprise feel.
> **All icons must be strictly imported from `lucide-react`.**

### Standard Icon Mappings:
- **Ledger Book**: `<BookOpen size={18} />`
- **Transactions / Balance**: `<CreditCard size={18} />`, `<TrendingUp size={16} />`, `<TrendingDown size={16} />`
- **Settings & Config**: `<Settings size={18} />`
- **Organization & Team**: `<Building2 size={18} />`, `<Users size={18} />`, `<UserPlus size={16} />`
- **Receipts & Photos**: `<Camera size={16} />`, `<FileText size={16} />`
- **Actions**: `<Plus size={14} />`, `<Minus size={14} />`, `<Trash2 size={14} />`, `<X size={16} />`

---

## 3. Tactile Click & Mobile Touch Feedback

Every interactive surface (buttons, cards, pills, icon buttons) provides immediate physical haptic feedback:

```css
/* Universal Interactive Touch & Click Scale in globals.css */
button,
[role="button"],
a,
input[type="submit"],
input[type="button"] {
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.15s ease,
              border-color 0.15s ease,
              box-shadow 0.15s ease;
}

/* Micro-compression on active click/press */
button:active:not(:disabled),
[role="button"]:active:not(:disabled),
a:active:not(:disabled) {
  transform: scale(0.965);
}
```

---

## 4. Screen Architecture & Mobile Edge-to-Edge Layout

Across Dashboard, Entry Books, and Settings Hub, `<main>` uses `px-0 sm:px-4` so grouped lists span **edge-to-edge on mobile** (`border-y sm:border rounded-none sm:rounded-2xl`), while standalone summary cards keep `mx-4 sm:mx-0` inset margins.

### Screen 1: Dashboard (`/dashboard`)
1. **Top Header**: Workspace initials + full-width mobile org switcher, full-width mobile `NotificationBell`, and team icon. Switches cleanly to a sticky focus-search bar (`←` + `Search by book name`) when search mode is active.
2. **Compact Balance Summary Card**: Clean white `bg-surface` banner (`border-border-default`, `rounded-2xl`) displaying `Current Balance`, book count, formatted total, and the surface-variant `[Copy]` spreadsheet dropdown (`CopyBooksButton`).
3. **Books Section**: Toolbar ("Your Books") with Sort/View toggle, Search trigger icon, and Admin `+ Add` pill button.
4. **Ledger Book List**: Single grouped white card (`divide-y divide-border-subtle`) with blue book icon, title, last updated date, formatted net balance, compact quick `+`/`-` cash actions, and shared `BookActionsMenu` (`⋮` 48x48px dropdown for `Book Information`, `Edit Book Details`, `Archive / Delete`). Supports `Card View`, `Compact List`, and `2-Column Grid`.
5. **Bottom Navigation**: Sticky tabs for **Books** (active blue), **Transactions**, and **Settings**.

### Screen 2: Book Details (`/orgs/[orgId]/expenses/[expenseId]`)
1. **Top Header**: Back arrow (`←`), book title, team/export icons, and shared `BookActionsMenu` (`⋮` 48x48px dropdown).
2. **Filter Bar & Popovers**: Unified full-width mobile popovers (`Date`, `Entry Type`, `Member`, `Category`, `Entries Limit`) with `min-h-[48px]` touchable options and borderless `BookDetailsModal` info view (`w-11 h-11` modal close targets).
3. **Summary & Transactions Stream**: Inset `LedgerSummaryCard` (`Net Balance`, `Total In`, `Total Out`, `View reports`), followed by edge-to-edge date-grouped entries.
4. **Sticky Dual Action Bar**: Fixed bottom bar featuring `+ Cash In` (`.btn-cash-in`) and `- Cash Out` (`.btn-cash-out`), auto-replacing `BottomNav` on `/expenses/` routes.

### Screen 3: Settings Hub (`/orgs/[orgId]/settings`) & Primary Nav Consistency
1. **Persistent `BottomNav` across Hub Routes**: Sticky bottom tabs (**Books**, **Transactions** → `/reports`, **Settings** → `/settings`) remain visible across `/dashboard`, `/orgs/[orgId]/reports`, `/orgs/[orgId]/settings`, and `/orgs/[orgId]/members`, while automatically hiding on `/expenses/` drill-down routes.
2. **Grouped Hub Layout**: Clean, initials-based account banner (zero default/placeholder images) followed by grouped settings rows:
   - **Workspace**: Business Profile (`EditOrgModal`, Admin-only), Categories (`ManageCategoriesModal`, Admin-only), Team & Access Control (`/orgs/[orgId]/members`).
   - **Account**: Your Profile (`UserProfileModal`).
   - **System** (Super Admin only): System Health (`/health`), Super Admin Console (`/admin`).
   - **Session**: Sign Out with promise-based confirmation dialog.

---

## 5. Mobile Touch Standards: 48x48px Hit-Box Rules

Mobile operating system standards (Apple Human Interface Guidelines & Google Material Design) require touch targets to be **at least 48x48 physical pixels** to prevent accidental mis-taps.

* **The Design Dilemma**: In dense, high-information-density fintech tables and cards, a visually 48px button creates clumsy, bloated interfaces.
* **The Solution (CSS Hit Slop)**: Keep the visible button compact (e.g., 32x32px or 36x36px) while expanding its invisible clickable area to 48x48px using a CSS pseudo-element:
  ```tsx
  className="relative min-w-[34px] min-h-[34px] touch-manipulation before:absolute before:-inset-2 before:content-['']"
  ```
* **Click Isolation**: Nested buttons inside clickable card links (`<Link href="...">`) must call `e.preventDefault()` and `e.stopPropagation()` to prevent unwanted parent navigation.

---

## 6. Tri-State Loading Lifecycle (Zero Cumulative Layout Shift)

When combining client-side Dexie IndexedDB cache with background server SWR, naive boolean loading flags cause visual glitches:

1. **The Problem**: If `cachedBooks.length === 0` initially while Dexie is opening, the UI prematurely renders the "No books found" empty state. 150ms later when Dexie completes or server data arrives, the screen jarringly shifts to show the books.
2. **The Tri-State Lifecycle**:
   - **State 1 (Hydrating / Loading)**: `cachedExpenses === undefined && !hasLoadedServer`. Displays smooth, pulsing skeleton placeholders (`BookListSkeleton`).
   - **State 2 (Data Present)**: `books.length > 0`. Instantly renders books from cache with 0ms delay.
   - **State 3 (Confirmed Empty)**: `books.length === 0 && (cachedExpenses !== undefined || hasLoadedServer)`. Only renders "No books found" when it is mathematically verified that zero books exist.

---

## 7. Promise-Based Native Mobile Dialogs

Standard browser `window.confirm()` and `alert()` are blocking, non-stylable, and broken inside mobile PWAs and WebViews. However, importing massive external modal libraries (like SweetAlert2) adds 100KB+ of unnecessary JavaScript bloat.

* **Production Architecture (`confirm-store.ts` & `ConfirmDialog.tsx`)**:
  - Promise-based API that behaves like a native async function:
    ```ts
    const confirmed = await confirmDialog({
      title: "Delete Book",
      description: "Are you sure you want to delete this empty book?",
      variant: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    ```
  - Resolvers are held at the module level (`let activeResolve = null`) rather than inside Zustand state to avoid functional state updater ambiguity.
  - Dialog is fully accessible: `role="dialog"`, `aria-modal="true"`, listens for `Escape` key, closes on backdrop click, and respects dark mode.
