"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, Wallet } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    setGoogleLoading(false);
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
          <Wallet size={20} className="stroke-[2.2]" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-txt-main">
          Cash<span className="text-primary">Book</span>
        </span>
      </div>

      {/* Heading & Subtitle */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-txt-main tracking-tight">
          Create an account
        </h1>
        <p className="text-xs sm:text-sm text-txt-secondary mt-1">
          Start managing your cash records with CashBook
        </p>
      </div>

      {/* Google OAuth Button */}
      <button
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-border-default hover:bg-subtle text-xs sm:text-sm font-semibold text-txt-main transition-all mb-5 cursor-pointer disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>{googleLoading ? "Redirecting…" : "Continue with Google"}</span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-txt-muted text-xs">Or register with email</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3.5 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-main">Full Name</label>
          <div className="relative">
            <User
              size={16}
              className="text-txt-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="Alex Romanov"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-subtle border border-border-default rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-main">Email address</label>
          <div className="relative">
            <Mail
              size={16}
              className="text-txt-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-subtle border border-border-default rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-txt-main">Password</label>
          <div className="relative">
            <Lock
              size={16}
              className="text-txt-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-subtle border border-border-default rounded-2xl pl-10 pr-10 py-2.5 sm:py-3 text-sm text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
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

        {/* Create Account Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 sm:py-3.5 rounded-full font-bold text-sm bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          <span>{loading ? "Creating account…" : "Create Account"}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      {/* Footer Link */}
      <p className="text-center text-txt-secondary text-xs sm:text-sm mt-6">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-primary font-bold hover:underline"
        >
          Sign in
        </Link>
      </p>

      {/* Developer Attribution (Read-only) */}
      <div className="text-center mt-6 pt-4 border-t border-border-subtle">
        <p className="text-[11px] text-txt-muted">
          Designed & Developed by{" "}
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
  );
}
