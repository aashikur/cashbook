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
  open: (options: ConfirmDialogOptions) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

// Module-level promise resolver avoids storing functions inside Zustand state
let activeResolve: ((value: boolean) => void) | null = null;

export const useConfirmStore = create<ConfirmDialogState>((set) => ({
  isOpen: false,
  options: {
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: "trash",
  },

  open: (options) => {
    set({
      isOpen: true,
      options: {
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "danger",
        icon: "trash",
        ...options,
      },
    });
  },

  handleConfirm: () => {
    if (activeResolve) {
      activeResolve(true);
      activeResolve = null;
    }
    set({ isOpen: false });
  },

  handleCancel: () => {
    if (activeResolve) {
      activeResolve(false);
      activeResolve = null;
    }
    set({ isOpen: false });
  },
}));

export const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    activeResolve = resolve;
    useConfirmStore.getState().open(options);
  });
};

export const alertDialog = (
  title: string,
  description: string,
  variant: "warning" | "info" | "danger" = "info"
): Promise<void> => {
  return new Promise((resolve) => {
    activeResolve = () => resolve();
    useConfirmStore.getState().open({
      title,
      description,
      confirmText: "Got it",
      hideCancel: true,
      variant,
      icon: variant === "danger" ? "trash" : variant === "warning" ? "alert" : "info",
    });
  });
};
