"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { ArrowLeft, Building2 } from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string }>;
};

export default function OrganizationEntryPage({ params }: PageProps) {
  const { orgId } = use(params);
  const router = useRouter();
  const { setActiveOrg } = useAppStore();
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveOrg() {
      try {
        const res = await fetch(`/api/v1/orgs/${orgId}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/sign-in");
          return;
        }
        if (res.ok && !cancelled) {
          const { data } = await res.json();
          if (data) {
            setActiveOrg({
              id: data.id,
              name: data.name,
              currency: data.currency || "USD",
              role: data.role || "viewer",
            });
            router.replace("/dashboard");
            return;
          }
        }
        if (!cancelled) {
          setNotFoundState(true);
        }
      } catch {
        if (!cancelled) {
          setNotFoundState(true);
        }
      }
    }

    resolveOrg();
    return () => {
      cancelled = true;
    };
  }, [orgId, router, setActiveOrg]);

  if (notFoundState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-canvas text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shadow-sm">
          <Building2 size={30} />
        </div>
        <h1 className="text-xl font-bold text-txt-main tracking-tight">
          Organization Not Found
        </h1>
        <p className="text-xs text-txt-secondary max-w-xs">
          This workspace does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-xs font-semibold text-white shadow-sm transition-all"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return <DashboardLoading />;
}
