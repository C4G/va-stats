import { authClient } from "@/lib/auth-client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const token = typeof router.query.token === "string" ? router.query.token : "";
    if (!token) return setMessage("This password reset link is invalid or incomplete.");

    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) return setMessage(result.error.message || "Unable to reset the password.");
    setComplete(true);
  };

  return (
    <>
      <Head>
        <title>Choose a password | Vision-Aid STATS</title>
      </Head>
      <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4 py-8">
        <section className="w-full max-w-[430px] rounded-xl border border-[#dce3ec] bg-white p-6 shadow-[0_12px_35px_rgba(22,45,76,0.1)] sm:p-8">
          <h1 className="mb-2 text-2xl font-semibold">Choose a new password</h1>
          {complete ? (
            <>
              <p className="text-[#176b3a]">Your password has been reset.</p>
              <Link className="mt-4 block text-center text-[#174a7e]" href="/auth/sign-in">
                Sign in
              </Link>
            </>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <label className="grid gap-1.5 font-semibold">
                New password
                <input
                  className="min-h-[42px] rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {message && (
                <p className="text-[#a32121]" role="alert">
                  {message}
                </p>
              )}
              <button
                className="min-h-[42px] cursor-pointer rounded-md border border-[#174a7e] bg-[#174a7e] px-4 py-2.5 text-white"
                type="submit"
              >
                Reset password
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
