import type { Metadata } from "next";
import Image from "next/image";
import { BarChart3, BookOpen, Wallet, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication - CashBook",
  description: "Sign in or register to manage your cash records with CashBook.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row w-full selection:bg-primary-light selection:text-primary">
      {/* Left Column: Visual Showcase (Reference Matched, Full Screen on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[56%] relative bg-gradient-to-br from-[#ebf3ff] via-[#f3f7ff] to-[#e2eeff] flex-col justify-between p-8 xl:p-14 border-r border-blue-200/40 overflow-hidden select-none">
        {/* Soft decorative background ambient curves & lighting */}
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-20 w-[440px] h-[440px] rounded-full bg-blue-600/25 blur-2xl pointer-events-none" />

        {/* 1. Top Section: Logo & Headline */}
        <div className="relative z-10">
          {/* Logo Badge */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Wallet size={20} className="stroke-[2.2]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Cash<span className="text-blue-600">Book</span>
            </span>
          </div>

          {/* Headline with Decorative Accent */}
          <div className="relative inline-block">
            <h1 className="text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Take control{" "} 
              <span className="relative inline-block">
                of your
                {/* Decorative hand-drawn angle marks */}
                <span className="absolute -top-2.5 -right-6 text-blue-500 font-normal text-xl select-none">
                  /
                </span>
              </span>
              <br />
              <span className="text-blue-600">money.</span>
            </h1>
          </div>

          <p className="text-base xl:text-lg text-slate-600 font-medium mt-3.5 max-w-lg">
            All your cash records, organized in one simple place.
          </p>
        </div>

        {/* 2. Middle Section: 3D Floating Dashboard Card */}
        <div className="relative z-10 my-auto py-6 flex items-center justify-center">
          <div className="relative w-full max-w-xl group">
            {/* Ambient lighting under card */}
            <div className="absolute inset-4 rounded-3xl bg-blue-600/15 blur-xl -z-10 transform scale-95" />

            {/* The 3D Dashboard Mockup Card */}
            <Image
              src="/img/login-hero2.png"
              alt="CashBook Dashboard Preview"
              width={2435}
              height={1096}
              priority
              className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl transition-transform duration-500 hover:scale-[1.01]"
            />

            {/* Decorative accent sparks on the right */}
            <div className="absolute -top-4 -right-4 flex gap-1 pointer-events-none opacity-80">
              <span className="w-1 h-3 bg-blue-500 rounded-full rotate-45 transform origin-bottom" />
              <span className="w-1 h-3.5 bg-blue-600 rounded-full -rotate-12" />
            </div>
          </div>
        </div>

        {/* 3. Bottom Section: Feature Highlights & Tagline */}
        <div className="relative z-10 pt-4">
          <div className="flex items-center justify-between max-w-lg mb-6">
            {/* Feature 1 */}
            <div className="flex-1 flex flex-col items-center text-center px-2">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 mb-2">
                <BookOpen size={20} className="stroke-[2.2]" />
              </div>
              <span className="text-xs xl:text-sm font-bold text-slate-800 leading-snug">
                Multiple
                <br />
                Books
              </span>
            </div>

            <div className="h-10 w-px bg-slate-300/60 shrink-0" />

            {/* Feature 2 */}
            <div className="flex-1 flex flex-col items-center text-center px-2">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 mb-2">
                <Zap size={20} className="stroke-[2.2] fill-blue-600/20" />
              </div>
              <span className="text-xs xl:text-sm font-bold text-slate-800 leading-snug">
                Income &amp;
                <br />
                Expense Tracking
              </span>
            </div>

            <div className="h-10 w-px bg-slate-300/60 shrink-0" />

            {/* Feature 3 */}
            <div className="flex-1 flex flex-col items-center text-center px-2">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 mb-2">
                <BarChart3 size={20} className="stroke-[2.2]" />
              </div>
              <span className="text-xs xl:text-sm font-bold text-slate-800 leading-snug">
                Clear Balance
                <br />
                Overview
              </span>
            </div>
          </div>

          {/* Footer Tagline */}
          <div className="text-xs xl:text-sm font-semibold text-slate-500 tracking-wider">
            Organize &nbsp;•&nbsp; Track &nbsp;•&nbsp; Understand
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-[44%] min-h-screen flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 bg-white dark:bg-slate-900 border-l border-border-subtle/50">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
