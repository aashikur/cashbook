"use client";

import React from "react";
import { useSession } from "@/lib/auth-client";
import { useAppStore } from "@/store/app-store";
import { Calendar, Mail, Shield, User, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { data: session } = useSession();
  const { activeOrg } = useAppStore();

  if (!isOpen) return null;

  const user = session?.user;
  const name = user?.name || "User";
  const email = user?.email || "No email available";

  // Initials badge instead of unstyled/broken placeholder images
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const memberRole = activeOrg?.role || "viewer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-surface border border-border-default w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in zoom-in-95 duration-150 flex flex-col gap-5 z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center">
              <User size={16} />
            </div>
            <h3 className="text-base font-bold text-txt-main">Your Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl text-txt-muted hover:text-txt-main hover:bg-subtle flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card with Initials Badge */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-subtle/50 border border-border-subtle">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-txt-main truncate">{name}</h4>
            <p className="text-xs text-txt-secondary truncate mt-0.5">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                  memberRole === "admin"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                }`}
              >
                {memberRole === "admin" ? "Admin (Full Access)" : "Viewer (Read Only)"}
              </span>
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-subtle/30 border border-border-subtle/60">
            <div className="flex items-center gap-2 text-txt-secondary">
              <Mail size={14} className="text-txt-muted" />
              <span>Email Address</span>
            </div>
            <span className="font-semibold text-txt-main truncate max-w-[200px]">{email}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-subtle/30 border border-border-subtle/60">
            <div className="flex items-center gap-2 text-txt-secondary">
              <Shield size={14} className="text-txt-muted" />
              <span>Workspace Role</span>
            </div>
            <span className="font-semibold text-txt-main capitalize">{memberRole}</span>
          </div>

          {user?.createdAt && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-subtle/30 border border-border-subtle/60">
              <div className="flex items-center gap-2 text-txt-secondary">
                <Calendar size={14} className="text-txt-muted" />
                <span>Account Member Since</span>
              </div>
              <span className="font-semibold text-txt-main">
                {formatDate(user.createdAt.toString()).split(",")[0] || "Recently"}
              </span>
            </div>
          )}
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer touch-manipulation"
        >
          Done
        </button>
      </div>
    </div>
  );
}
