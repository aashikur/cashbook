"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface HealthData {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  totalLatencyMs: number;
  environment: string;
  services: {
    database: {
      status: "connected" | "disconnected";
      latencyMs?: number;
      databaseName?: string;
      serverTime?: string;
      records?: {
        users: number;
        organizations: number;
        books: number;
        transactions: number;
      };
      error?: string;
    };
    auth: {
      status: string;
      engine: string;
      googleOAuth: boolean;
    };
    storage: {
      status: string;
      bucket: string;
      zeroEgress: boolean;
    };
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const isHealthy = data?.status === "healthy";
  const dbStatus = data?.services?.database?.status === "connected";

  return (
    <div className="min-h-screen bg-canvas flex flex-col p-4 sm:p-6 pb-12">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-5">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-txt-secondary hover:text-txt-main transition-colors w-fit"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-txt-secondary hover:text-txt-main p-1.5 px-3 rounded-xl border border-border-default bg-surface shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} />
            <span>{loading ? "Checking..." : "Refresh"}</span>
          </button>
        </div>

        {/* Header Status Banner */}
        <div className="bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isHealthy
                  ? "bg-cash-in-light text-cash-in border border-cash-in-border"
                  : "bg-cash-out-light text-cash-out border border-cash-out-border"
              }`}
            >
              {isHealthy ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
            </div>
            {isHealthy && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cash-in opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cash-in"></span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-txt-main tracking-tight">
            {isHealthy ? "All Systems Operational" : "Service Disruption Detected"}
          </h1>
          <p className="text-xs text-txt-secondary mt-1">
            Uptime: {data ? Math.floor(data.uptimeSeconds / 60) : 0} mins • Total Latency:{" "}
            {data?.totalLatencyMs || 0}ms • Last checked: {lastChecked || "just now"}
          </p>

          <Link
            href="/api/health"
            target="_blank"
            className="mt-3 text-[11px] font-mono text-primary hover:underline"
          >
            Raw JSON API: /api/health
          </Link>
        </div>

        {/* Detailed Service Cards */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-txt-secondary uppercase tracking-wider px-1">
            Component Status
          </h2>

          {/* Database Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-txt-main">
                    Neon PostgreSQL Serverless
                  </h3>
                  <p className="text-[11px] text-txt-muted">
                    Database: {data?.services?.database?.databaseName || "neondb"}
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  dbStatus
                    ? "bg-cash-in-light text-cash-in border-cash-in-border"
                    : "bg-cash-out-light text-cash-out border-cash-out-border"
                }`}
              >
                {dbStatus ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>

            {dbStatus && data?.services?.database?.records && (
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border-subtle">
                <div className="flex flex-col items-center bg-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-txt-muted uppercase">Users</span>
                  <span className="text-sm font-bold font-mono text-txt-main">
                    {data.services.database.records.users}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-txt-muted uppercase">Orgs</span>
                  <span className="text-sm font-bold font-mono text-txt-main">
                    {data.services.database.records.organizations}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-txt-muted uppercase">Books</span>
                  <span className="text-sm font-bold font-mono text-txt-main">
                    {data.services.database.records.books}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-txt-muted uppercase">Logs</span>
                  <span className="text-sm font-bold font-mono text-txt-main">
                    {data.services.database.records.transactions}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Better Auth Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-main">
                  Authentication Engine
                </h3>
                <p className="text-[11px] text-txt-muted">
                  Better Auth self-hosted session & RBAC guards
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cash-in-light text-cash-in border border-cash-in-border">
              CONFIGURED
            </span>
          </div>

          {/* Storage Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
                <HardDrive size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-main">
                  Receipt Photo Storage
                </h3>
                <p className="text-[11px] text-txt-muted">
                  Cloudflare R2 S3 API (Zero Egress Fees)
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary-border">
              READY
            </span>
          </div>

          {/* Server Process Metrics */}
          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
                <Server size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-main">
                  Node.js Runtime & Memory
                </h3>
                <p className="text-[11px] text-txt-muted">
                  Heap: {data?.memory?.heapUsedMb || 0} MB • RSS: {data?.memory?.rssMb || 0} MB
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cash-in-light text-cash-in border border-cash-in-border">
              NORMAL
            </span>
          </div>

          {/* Software Architecture & Creator */}
          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
                <Code2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-main">
                  Software Engineering & Architecture
                </h3>
                <p className="text-[11px] text-txt-muted">
                  Designed & Engineered by{" "}
                  <a
                    href="https://wa.me/8801580563883"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-txt-main hover:text-primary hover:underline transition-colors"
                  >
                    Aashikur Rahaman
                  </a>
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-subtle text-txt-secondary border border-border-default font-mono">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
