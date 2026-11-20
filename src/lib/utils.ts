import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = "BDT",
  locale = "en-BD"
): string {
  // Use BDT symbol ৳ manually since Intl may not render it on all systems
  const formatted = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "BDT" ? "৳" : currency;
  return `${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  // Handle date-only strings (YYYY-MM-DD) without timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFiscalPeriod(date: Date = new Date()): {
  fiscalYear: number;
  fiscalMonth: number;
} {
  return {
    fiscalYear: date.getFullYear(),
    fiscalMonth: date.getMonth() + 1,
  };
}

export function toLogDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
