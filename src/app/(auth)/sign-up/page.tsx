"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { BookOpen, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await signUp.email({
        name,
        email,
        password,
      });
      if (authError) {
        setError(authError.message ?? "Could not create account.");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface border border-border-default rounded-3xl p-8 shadow-sm">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary mb-3">
          <BookOpen size={24} />
        </div>
        <h1 className="text-2xl font-bold text-txt-main tracking-tight">
          Create an Account
        </h1>
        <p className="text-txt-secondary text-xs mt-1">
          Start tracking your books and expenses
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3.5 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-secondary">Full Name</label>
          <input
            type="text"
            required
            autoComplete="name"
            placeholder="Alex Romanov"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-subtle border border-border-default rounded-xl px-4 py-2.5 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-secondary">Email Address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-subtle border border-border-default rounded-xl px-4 py-2.5 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-secondary">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-subtle border border-border-default rounded-xl px-4 py-2.5 pr-10 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-main p-1 rounded-md transition-colors cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl font-bold text-xs bg-primary hover:bg-primary-hover text-white shadow-sm transition-all disabled:opacity-60 cursor-pointer mt-1"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-txt-secondary text-xs mt-6">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>

      {/* Developer Attribution (Read-only) */}
      <div className="text-center mt-6 pt-4 border-t border-border-subtle">
        <p className="text-[11px] text-txt-muted">
          Designed & Developed by{" "}
          <span className="font-semibold text-txt-main">Aashikur Rahaman</span>
        </p>
      </div>
    </div>
  );
}
