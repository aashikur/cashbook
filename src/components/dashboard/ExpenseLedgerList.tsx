"use client";

import React from "react";
import BookCard from "./BookCard";
import { useAppStore } from "@/store/app-store";
import { BookOpen, Plus } from "lucide-react";

export interface ExpenseItem {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  updatedAt: string;
}

interface ExpenseLedgerListProps {
  expenses: ExpenseItem[];
}

export default function ExpenseLedgerList({
  expenses,
}: ExpenseLedgerListProps) {
  const { activeOrg, setAddExpenseOpen } = useAppStore();
  const currency = activeOrg?.currency || "BDT";

  return (
    <div className="flex flex-col gap-3">
      {/* Section Header (Screen 1 Reference) */}
      <div className="flex items-center justify-between px-0.5 pt-1">
        <h2 className="text-xl font-bold text-txt-main tracking-tight">
          Your books
        </h2>

        {activeOrg?.role === "admin" && (
          <button
            onClick={() => setAddExpenseOpen(true)}
            className="btn-pill-primary cursor-pointer active:scale-95 transition-transform"
          >
            <Plus size={15} />
            <span>+ Add New Book</span>
          </button>
        )}
      </div>

      {/* Book Cards */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-surface border border-dashed border-border-default rounded-3xl text-center gap-3 my-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
            <BookOpen size={22} />
          </div>
          <div className="text-sm font-bold text-txt-main">
            No books created yet
          </div>
          <p className="text-xs text-txt-muted max-w-xs">
            Create books like &ldquo;January expenses&rdquo;, &ldquo;Groceries&rdquo;, or &ldquo;Savings&rdquo;.
          </p>
          {activeOrg?.role === "admin" && (
            <button
              onClick={() => setAddExpenseOpen(true)}
              className="mt-1 btn-pill-primary cursor-pointer"
            >
              <Plus size={15} />
              <span>Create First Book</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {expenses.map((expense) => (
            <BookCard
              key={expense.id}
              id={expense.id}
              orgId={expense.orgId}
              title={expense.title}
              category={expense.category}
              totalSpent={expense.totalSpent}
              logCount={expense.logCount}
              updatedAt={expense.updatedAt}
              currency={currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}
