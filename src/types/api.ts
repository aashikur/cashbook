// API route types — shared between server Route Handlers and client fetchers

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// ─── Organization ──────────────────────────────────────────────────────────────

export type OrganizationDTO = {
  id: string;
  name: string;
  description?: string;
  currency: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type OrgWithRole = OrganizationDTO & {
  role: "admin" | "viewer";
};

// ─── Org Member ────────────────────────────────────────────────────────────────

export type OrgMemberDTO = {
  id: string;
  orgId: string;
  userId: string;
  userEmail: string;
  role: "admin" | "viewer";
  status: "pending" | "active" | "revoked";
  invitedBy: string;
  joinedAt: string;
};

// ─── Expense ───────────────────────────────────────────────────────────────────

export type ExpenseDTO = {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number; // in paisa
  logCount: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseInput = {
  id: string; // client-generated UUID
  title: string;
  category?: string;
};

// ─── Daily Log ─────────────────────────────────────────────────────────────────

export type AttachmentDTO = {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export type DailyLogDTO = {
  id: string;
  orgId: string;
  expenseId: string;
  amountPaisa: number;
  note: string;
  logDate: string; // YYYY-MM-DD
  fiscalYear: number;
  fiscalMonth: number;
  attachments: AttachmentDTO[];
  loggedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CreateLogInput = {
  id: string; // client-generated UUID
  amountPaisa: number;
  note: string;
  logDate: string;
  attachments?: AttachmentDTO[];
};

export type UpdateLogInput = Partial<
  Pick<CreateLogInput, "amountPaisa" | "note" | "logDate" | "attachments">
> & { expenseId?: string };

// ─── Sync ──────────────────────────────────────────────────────────────────────

export type DeltaSyncResponse = {
  expenses: ExpenseDTO[];
  dailyLogs: DailyLogDTO[];
  serverTimestamp: string;
};

// ─── Reports ───────────────────────────────────────────────────────────────────

export type MonthlySummary = {
  fiscalYear: number;
  fiscalMonth: number;
  totalPaisa: number;
  logCount: number;
};

export type ExpenseSummary = {
  expenseId: string;
  title: string;
  totalPaisa: number;
  logCount: number;
};

export type OrgSummaryReport = {
  year: number;
  monthlyBreakdown: MonthlySummary[];
  expenseBreakdown: ExpenseSummary[];
  grandTotalPaisa: number;
};
