import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-canvas text-center">
      <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary-border flex items-center justify-center text-primary mb-4 shadow-sm">
        <FileQuestion size={32} />
      </div>
      <h1 className="text-2xl font-bold text-txt-main tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-txt-secondary max-w-sm mb-6">
        The ledger, page, or resource you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white shadow-sm transition-all"
      >
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
