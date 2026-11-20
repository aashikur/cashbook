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

## 4. Screen Architecture

### Screen 1: Dashboard (`/dashboard`)
1. **Top Header**: User profile photo/initials + Name dropdown ("Alex Romanov ∨") + Team invitation icon.
2. **Search Bar**: Pill-shaped "Search books" input with right-aligned filter icon.
3. **Books Section**: Heading ("Your books") with right-aligned pill `+ Add New Book` button (`.btn-pill-primary`).
4. **Ledger Book List**: Pure white cards with rounded blue book icon, book name, last modified date, and formatted numeric balance.
5. **Bottom Navigation**: Sticky tabs for **Books** (active blue), **Transactions**, and **Settings**.

### Screen 2: Book Details (`/orgs/[orgId]/expenses/[expenseId]`)
1. **Top Header**: Back arrow (`←`), book title, and team/menu icons.
2. **Dual Balance Cards**:
   - **Total In**: Solid Blue card (`#2563EB`) displaying total inflow amount with dropdown indicator.
   - **Total Out**: Solid Red card (`#DC2626`) displaying total outflow amount with dropdown indicator.
3. **Transactions Stream**: Chronological list of logs with category icon (supermarket, restaurant, bookshop, freelance), relative time ("2 min ago"), and formatted cash values (`+15000` / `-500`).
4. **Sticky Dual Action Bar**: Fixed bottom bar featuring two equal-width CTA buttons:
   - `+ Cash In` (Vibrant green: `.btn-cash-in`)
   - `- Cash Out` (Vibrant red: `.btn-cash-out`)
