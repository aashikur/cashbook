import { redirect } from "next/navigation";

/**
 * Root "/" — redirect to dashboard if logged in, else to sign-in.
 * Auth check handled in middleware.
 */
export default function RootPage() {
  redirect("/dashboard");
}
