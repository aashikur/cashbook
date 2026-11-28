import { create } from "zustand";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  icon?: "trash" | "archive" | "alert" | "info";
  hideCancel?: boolean;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions;
  resolvePromise: ((value: boolean) => void) | null;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (title: string, description: string, variant?: "warning" | "info" | "danger") => Promise<void>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmDialogState>((set, get) => ({
  isOpen: false,
  options: {
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: "trash",
  },
  resolvePromise: null,

  confirm: (options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: {
          confirmText: "Confirm",
          cancelText: "Cancel",
          variant: "danger",
          icon: "trash",
          ...options,
        },
        resolvePromise: () => resolve,
      });
    });
  },

  alert: (title, description, variant = "info") => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: {
          title,
          description,
          confirmText: "Got it",
          cancelText: "",
          hideCancel: true,
          variant,
          icon: variant === "danger" ? "trash" : variant === "warning" ? "alert" : "info",
        },
        resolvePromise: () => () => resolve(),
      });
    });
  },

  handleConfirm: () => {
    const { resolvePromise } = get();
    if (resolvePromise) resolvePromise(true);
    set({ isOpen: false, resolvePromise: null });
  },

  handleCancel: () => {
    const { resolvePromise } = get();
    if (resolvePromise) resolvePromise(false);
    set({ isOpen: false, resolvePromise: null });
  },
}));

export const confirmDialog = (options: ConfirmDialogOptions) =>
  useConfirmStore.getState().confirm(options);

export const alertDialog = (title: string, description: string, variant?: "warning" | "info" | "danger") =>
  useConfirmStore.getState().alert(title, description, variant);
