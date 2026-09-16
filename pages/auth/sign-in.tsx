import { authClient, useSession } from "@/lib/auth-client-compat";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const getMessage = (error) => error?.message || error?.statusText || "Authentication failed. Please try again.";

export default function SignInPage() {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace("/default");
  }, [router, status]);

  const finish = async (result) => {
    if (result.error) {
      setMessage(getMessage(result.error));
      return;
    }
    await router.push("/default");
  };

  const submitEmail = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNotice("");
    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({ name, email, password, callbackURL: "/default" });
        if (result.error) return setMessage(getMessage(result.error));
        setMode("sign-in");
        setPassword("");
        setNotice("Check your email for a verification link, then sign in.");
        return;
      }

      const result = await authClient.signIn.email({ email, password, callbackURL: "/default" });
      await finish(result);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setMessage("");
    setNotice("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/default",
      errorCallbackURL: "/auth/sign-in",
    });
    if (result.error) {
      setMessage(getMessage(result.error));
      setBusy(false);
    }
  };

  const signInWithPasskey = async () => {
    setBusy(true);
    setMessage("");
    setNotice("");
    try {
      const result = await authClient.signIn.passkey();
      await finish(result);
    } catch (error) {
      setMessage(getMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in | Vision-Aid STATS</title>
      </Head>
      <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4 py-8">
        <section
          className="w-full max-w-[430px] rounded-xl border border-[#dce3ec] bg-white p-6 shadow-[0_12px_35px_rgba(22,45,76,0.1)] sm:p-8"
          aria-labelledby="auth-heading"
        >
          <Link href="/" className="mb-5 inline-block font-bold tracking-[0.04em] text-[#174a7e]">
            VISION-AID ACADEMY
          </Link>
          <h1 id="auth-heading" className="mb-2 text-2xl font-semibold">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mb-6 text-[#536170]">
            {mode === "register"
              ? "Use the email address listed on your Vision-Aid staff profile."
              : "Sign in with Google, your password, or a passkey."}
          </p>

          <button
            className="mb-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-[#aeb9c5] bg-white font-[inherit] disabled:cursor-wait disabled:opacity-65"
            onClick={signInWithGoogle}
            disabled={busy}
            type="button"
          >
            <Image src="/icons/google-logo.svg" alt="" width={20} height={20} />
            Continue with Google
          </button>
          <button
            className="mb-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-[#aeb9c5] bg-white font-[inherit] disabled:cursor-wait disabled:opacity-65"
            onClick={signInWithPasskey}
            disabled={busy}
            type="button"
          >
            <span aria-hidden="true" className="text-[#174a7e]">
              ◆
            </span>
            Sign in with a passkey
          </button>

          <div className="my-4 flex items-center gap-3 text-[#667585]">
            <span className="h-px flex-1 bg-[#dce3ec]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[#dce3ec]" />
          </div>

          <form onSubmit={submitEmail} className="grid gap-4">
            {mode === "register" && (
              <label className="grid gap-1.5 font-semibold">
                Name
                <input
                  className="min-h-[42px] rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
            )}
            <label className="grid gap-1.5 font-semibold">
              Email
              <input
                className="min-h-[42px] rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="grid gap-1.5 font-semibold">
              Password
              <input
                className="min-h-[42px] rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </label>
            {message && (
              <p className="text-[#a32121]" role="alert">
                {message}
              </p>
            )}
            {notice && (
              <p className="text-[#176b3a]" role="status">
                {notice}
              </p>
            )}
            <button
              className="min-h-[42px] cursor-pointer rounded-md border border-[#174a7e] bg-[#174a7e] px-4 py-2.5 text-white disabled:cursor-wait disabled:opacity-65"
              disabled={busy}
              type="submit"
            >
              {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          <button
            className="mt-5 w-full cursor-pointer border-0 bg-transparent font-[inherit] text-[#174a7e]"
            type="button"
            onClick={() => {
              setMode(mode === "register" ? "sign-in" : "register");
              setMessage("");
            }}
          >
            {mode === "register" ? "Already have an account? Sign in" : "First time here? Create a password"}
          </button>
          {mode === "sign-in" && (
            <Link className="mt-4 block text-center text-[#174a7e]" href="/auth/forgot-password">
              Forgot your password?
            </Link>
          )}
        </section>
      </main>
    </>
  );
}
