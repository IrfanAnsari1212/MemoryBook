import type { Metadata } from "next";
import { RecoverForm } from "@/components/admin/recover-form";

export const metadata: Metadata = { title: "Account recovery", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Account recovery</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Forgot your email or password? Enter your recovery key and choose a new email and password.
        </p>
        <RecoverForm />
      </div>
    </main>
  );
}
