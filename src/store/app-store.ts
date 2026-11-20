import { create } from "zustand";

type OrgContext = {
  id: string;
  name: string;
  currency: string;
  role: "admin" | "viewer";
};

type AppState = {
  // Active org
  activeOrg: OrgContext | null;
  setActiveOrg: (org: OrgContext | null) => void;

  // Date filter (YYYY-MM-DD or empty for all)
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  clearDateFilter: () => void;

  // Active expense (for log entry context)
  activeExpenseId: string | null;
  setActiveExpenseId: (id: string | null) => void;

  // Log entry mode: "in" (Cash In) vs "out" (Cash Out)
  logType: "in" | "out";
  setLogType: (type: "in" | "out") => void;

  // Modal states
  isAddExpenseOpen: boolean;
  setAddExpenseOpen: (open: boolean) => void;

  isAddLogOpen: boolean;
  setAddLogOpen: (open: boolean) => void;

  isOrgSwitcherOpen: boolean;
  setOrgSwitcherOpen: (open: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeOrg: null,
  setActiveOrg: (org) => set({ activeOrg: org }),

  selectedDate: "",
  setSelectedDate: (date) => set({ selectedDate: date }),
  clearDateFilter: () => set({ selectedDate: "" }),

  activeExpenseId: null,
  setActiveExpenseId: (id) => set({ activeExpenseId: id }),

  logType: "out",
  setLogType: (type) => set({ logType: type }),

  isAddExpenseOpen: false,
  setAddExpenseOpen: (open) => set({ isAddExpenseOpen: open }),

  isAddLogOpen: false,
  setAddLogOpen: (open) => set({ isAddLogOpen: open }),

  isOrgSwitcherOpen: false,
  setOrgSwitcherOpen: (open) => set({ isOrgSwitcherOpen: open }),
}));
