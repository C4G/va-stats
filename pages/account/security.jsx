import Navbar from "@/components/Navbar";
import { authClient, useSession } from "@/lib/auth-client-compat";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

export default function SecurityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [passkeys, setPasskeys] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [password, setPassword] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState(null);

  const loadSecurityMethods = useCallback(async () => {
    const [passkeyResult, accountResult] = await Promise.all([
      authClient.passkey.listUserPasskeys(),
      authClient.listAccounts(),
    ]);
    setPasskeys(passkeyResult.data ?? []);
    setAccounts(accountResult.data ?? []);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/sign-in");
    if (status === "authenticated") loadSecurityMethods();
  }, [loadSecurityMethods, router, status]);

  const hasPassword = accounts.some((account) => account.providerId === "credential");

  const addPasskey = async () => {
    setError("");
    setMessage("");
    const result = await authClient.passkey.addPasskey({ name: passkeyName || undefined });
    if (result.error) return setError(result.error.message || "Could not add the passkey.");
    setPasskeyName("");
    setMessage("Passkey added.");
    await loadSecurityMethods();
  };

  const deletePasskey = async (id) => {
    setError("");
    setMessage("");
    setDeletingPasskeyId(id);
    try {
      const result = await authClient.passkey.deletePasskey({ id });
      if (result.error) {
        setError(result.error.message || "Could not remove the passkey.");
        return;
      }
      setMessage("Passkey removed.");
      await loadSecurityMethods();
    } catch (requestError) {
      console.error("Unable to remove passkey:", requestError);
      setError("Could not reach the authentication service. Please try again.");
    } finally {
      setDeletingPasskeyId(null);
    }
  };

  const setInitialPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message || "Could not set the password.");
        return;
      }
      setPassword("");
      setMessage("Password added. You can now sign in with email and password.");
      await loadSecurityMethods();
    } catch (requestError) {
      console.error("Unable to set password:", requestError);
      setError("Could not reach the authentication service. Please try again.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Account security | Vision-Aid STATS</title>
      </Head>
      <Navbar user_role={session?.user?.role} />
      <main className="mx-auto mb-16 mt-8 w-[calc(100%-2rem)] max-w-[900px]">
        <h1 className="mb-2 text-2xl font-semibold">Account security</h1>
        <p>Manage the ways you sign in as {session?.user?.email}.</p>
        {(message || error) && (
          <p className={error ? "text-[#a32121]" : "text-[#176b3a]"} role="status">
            {error || message}
          </p>
        )}

        {!hasPassword && (
          <section className="mt-6 rounded-xl border border-[#dce3ec] bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold">Add a password</h2>
            <p>Your account currently uses a linked provider. Add a password to enable email sign-in.</p>
            <form onSubmit={setInitialPassword} className="flex max-w-[600px] items-stretch gap-3 max-[540px]:flex-col">
              <input
                className="min-h-[42px] min-w-0 flex-1 rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                aria-label="New password"
              />
              <button
                type="submit"
                disabled={passwordBusy}
                className="min-h-[42px] cursor-pointer rounded-md border border-[#174a7e] bg-[#174a7e] px-4 py-2.5 text-white"
              >
                {passwordBusy ? "Adding…" : "Add password"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-[#dce3ec] bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold">Passkeys</h2>
          <p>Use your device screen lock, fingerprint, face, or hardware security key.</p>
          <div className="flex max-w-[600px] items-stretch gap-3 max-[540px]:flex-col">
            <input
              className="min-h-[42px] min-w-0 flex-1 rounded-md border border-[#9caaba] px-3 py-2 font-[inherit]"
              value={passkeyName}
              onChange={(event) => setPasskeyName(event.target.value)}
              placeholder="Passkey name (optional)"
              aria-label="Passkey name"
            />
            <button
              type="button"
              className="min-h-[42px] cursor-pointer rounded-md border border-[#174a7e] bg-[#174a7e] px-4 py-2.5 text-white"
              onClick={addPasskey}
            >
              Add passkey
            </button>
          </div>
          {passkeys.length > 0 ? (
            <ul className="m-0 mt-4 list-none p-0">
              {passkeys.map((key) => (
                <li className="flex items-center justify-between border-t border-[#dce3ec] py-3" key={key.id}>
                  <span>{key.name || "Passkey"}</span>
                  <button
                    className="cursor-pointer rounded-md border border-[#a32121] bg-white px-3 py-1.5 text-[#a32121] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => deletePasskey(key.id)}
                    disabled={deletingPasskeyId !== null}
                    aria-busy={deletingPasskeyId === key.id}
                  >
                    {deletingPasskeyId === key.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No passkeys have been added yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
