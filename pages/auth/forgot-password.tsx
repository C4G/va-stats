import { authClient } from "@/lib/auth-client";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/auth/reset-password",
    });
    setBusy(false);
    setSent(true);
  };

  return (
    <>
      <Head>
        <title>Reset password | Vision-Aid STATS</title>
      </Head>
      <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4 py-8">
        <section className="w-full max-w-[430px] rounded-xl border border-[#dce3ec] bg-white p-6 shadow-[0_12px_35px_rgba(22,45,76,0.1)] sm:p-8">
          <h1 className="mb-2 text-2xl font-semibold">Reset your password</h1>
          <p className="mb-6 text-[#536170]">
            Enter your staff email address and we’ll send a reset link if it has a password account.
          </p>
          {sent ? (
            <p className="text-[#176b3a]" role="status">
              Check your email for a password reset link.
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <label className="grid gap-1.5 font-semibold">
                Email
                <input
                  className="min-h-[42px] rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className="min-h-[42px] cursor-pointer rounded-md border border-[#174a7e] bg-[#174a7e] px-4 py-2.5 text-white disabled:cursor-wait disabled:opacity-65"
                disabled={busy}
                type="submit"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
          <Link className="mt-4 block text-center text-[#174a7e]" href="/auth/sign-in">
            Back to sign in
          </Link>
        </section>
      </main>
    </>
  );
}
