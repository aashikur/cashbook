import type { Metadata } from "next";
import Image from "next/image";

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
      {/* Left Column: Visual Showcase (Mockup Matched, Visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-[#e7effe] items-center justify-center p-6 xl:p-12 border-r border-border-subtle/50 overflow-hidden">
        {/* Soft decorative ambient lighting orbs */}
        <div className="absolute top-1/4 -left-16 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* High-Resolution Hero Visual Asset */}
        <div className="relative z-10 w-full max-w-2xl flex items-center justify-center">
          <Image
            src="/img/CashBook-Finance-Dashboard-Login.png"
            alt="CashBook - Take control of your money"
            width={920}
            height={1018}
            priority
            className="w-full h-auto max-h-[92vh] object-contain drop-shadow-xl rounded-2xl"
          />
        </div>
      </div>

      {/* Right Column: Interactive Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-h-screen flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-canvas">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
