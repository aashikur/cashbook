import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrgContext = {
  id: string;
  name: string;
  currency: string;
  role: "admin" | "viewer";
};

type AppState = {
  // Active org & list
  activeOrg: OrgContext | null;
  setActiveOrg: (org: OrgContext | null) => void;
  orgs: OrgContext[];
  setOrgs: (orgs: OrgContext[]) => void;
  addOrg: (org: OrgContext) => void;
  updateOrgInStore: (updated: Partial<OrgContext> & { id: string }) => void;
  removeOrgFromStore: (id: string) => void;

  // Loading state for organizations
  isOrgsLoading: boolean;
  setIsOrgsLoading: (loading: boolean) => void;

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

  isEditOrgOpen: boolean;
  setEditOrgOpen: (open: boolean) => void;
  editingOrg: OrgContext | null;
  setEditingOrg: (org: OrgContext | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeOrg: null,
      setActiveOrg: (org) => set({ activeOrg: org }),
      orgs: [],
      setOrgs: (orgs) => set({ orgs }),
      addOrg: (org) =>
        set((state) => {
          const exists = state.orgs.some((o) => o.id === org.id);
          const nextOrgs = exists
            ? state.orgs.map((o) => (o.id === org.id ? org : o))
            : [org, ...state.orgs];
          return { orgs: nextOrgs, activeOrg: org };
        }),
      updateOrgInStore: (updated) =>
        set((state) => {
          const nextOrgs = state.orgs.map((o) =>
            o.id === updated.id ? { ...o, ...updated } : o
          );
          const nextActive =
            state.activeOrg?.id === updated.id
              ? { ...state.activeOrg, ...updated }
              : state.activeOrg;
          return { orgs: nextOrgs, activeOrg: nextActive };
        }),
      removeOrgFromStore: (id) =>
        set((state) => {
          const nextOrgs = state.orgs.filter((o) => o.id !== id);
          const nextActive =
            state.activeOrg?.id === id
              ? nextOrgs.length > 0
                ? nextOrgs[0]
                : null
              : state.activeOrg;
          return { orgs: nextOrgs, activeOrg: nextActive };
        }),

      isOrgsLoading: true,
      setIsOrgsLoading: (loading) => set({ isOrgsLoading: loading }),

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

      isEditOrgOpen: false,
      setEditOrgOpen: (open) => set({ isEditOrgOpen: open }),
      editingOrg: null,
      setEditingOrg: (org) => set({ editingOrg: org }),
    }),
    {
      name: "cashbook-app-storage",
      partialize: (state) => ({ activeOrg: state.activeOrg }),
    }
  )
);
