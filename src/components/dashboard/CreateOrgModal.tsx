"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Building2, X } from "lucide-react";

export default function CreateOrgModal() {
  const { isOrgSwitcherOpen, setOrgSwitcherOpen, setActiveOrg, addOrg } = useAppStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOrgSwitcherOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          currency: currency.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create organization");
        return;
      }

      const newOrg = {
        id: data.data.id,
        name: data.data.name,
        currency: data.data.currency,
        role: "admin" as const,
      };

      addOrg(newOrg);
      setActiveOrg(newOrg);

      setOrgSwitcherOpen(false);
      setName("");
      setDescription("");
    } catch {
      setError("Network error while creating organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-default w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={() => setOrgSwitcherOpen(false)}
          className="absolute right-4 top-4 text-txt-muted hover:text-txt-secondary p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-txt-main">
              Create Organization
            </h2>
            <p className="text-xs text-txt-secondary">
              Personal or company ledger workspace
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-txt-secondary">
              Workspace Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. My Finances, Alpha Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-txt-secondary">
              Default Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="INR">INR (₹) - Indian Rupee</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-txt-secondary">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of this workspace"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors resize-none"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setOrgSwitcherOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-border-default text-xs font-semibold text-txt-secondary hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white shadow-sm shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating..." : "Save Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
