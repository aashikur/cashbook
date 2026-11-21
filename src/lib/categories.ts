import {
  Home,
  Car,
  Utensils,
  Zap,
  ShoppingBag,
  Briefcase,
  HeartPulse,
  Tag,
  Coffee,
  Fuel,
  Plane,
  LucideIcon,
} from "lucide-react";

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Core 5 universal default categories
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "General", label: "General", icon: Tag },
  { id: "Rent", label: "Rent", icon: Home },
  { id: "EMI / Installment", label: "EMI / Installment", icon: Car },
  { id: "Food & Dining", label: "Food & Dining", icon: Utensils },
  { id: "Bills & Utilities", label: "Bills & Utilities", icon: Zap },
];

// Helper to resolve an appropriate Lucide icon for any default or custom category
export function getCategoryIcon(categoryName?: string): LucideIcon {
  if (!categoryName) return Tag;
  const lower = categoryName.toLowerCase();

  if (lower === "rent" || lower.includes("home") || lower.includes("house") || lower.includes("flat")) {
    return Home;
  }
  if (lower.includes("emi") || lower.includes("installment") || lower.includes("car") || lower.includes("bike") || lower.includes("vehicle")) {
    return Car;
  }
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("nasta") || lower.includes("lunch") || lower.includes("dinner")) {
    return Utensils;
  }
  if (lower.includes("bill") || lower.includes("electric") || lower.includes("gas") || lower.includes("utility") || lower.includes("water") || lower.includes("internet")) {
    return Zap;
  }
  if (lower.includes("shop") || lower.includes("cloth") || lower.includes("shirt") || lower.includes("dress") || lower.includes("market")) {
    return ShoppingBag;
  }
  if (lower.includes("salary") || lower.includes("business") || lower.includes("office") || lower.includes("client")) {
    return Briefcase;
  }
  if (lower.includes("med") || lower.includes("doctor") || lower.includes("hospital") || lower.includes("pharma")) {
    return HeartPulse;
  }
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("cafe")) {
    return Coffee;
  }
  if (lower.includes("fuel") || lower.includes("petrol") || lower.includes("gasoline")) {
    return Fuel;
  }
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("tour") || lower.includes("ticket")) {
    return Plane;
  }

  return Tag;
}
