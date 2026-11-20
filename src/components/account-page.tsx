"use client";

import Link from "next/link";
import { useState } from "react";
import { activityPath, LOCATION_KEY } from "@/lib/account-data";
import { usePracticeAccount } from "./practice-account";

export default function AccountPage() {
  const {
    configured,
    client,
    session,
    engine,
    sync,
    offer,
    loadError,
    retryLoad,
    signOut,
  } = usePracticeAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lastPath = engine?.getItem(LOCATION_KEY);
  const resume = lastPath && activityPath(lastPath) ? lastPath : "/practice";

  async function authenticate(create: boolean) {
    if (!client || busy || !email.trim() || !password) return;
    setBusy(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const result = create
        ? await client.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: window.location.origin + "/account" },
          })
        : await client.auth.signInWithPassword(credentials);
      if (result.error) setMessage(result.error.message);
      else if (create && !result.data.session)
        setMessage("Check your email for a confirmation link, then sign in.");
      else setMessage("");
    } catch {
      setMessage("Could not reach sign-in. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function leave(discard = false) {
    setBusy(true);
    const success = await signOut(discard);
    setMessage(
      success
        ? "Signed out. This browser’s guest practice is available again."
        : engine?.hasUnsynced()
          ? "Unsynced changes are still open. Sync them before signing out, or choose to discard them."
          : "Sign-out failed. Please try again.",
    );
    setConfirmDiscard(!success && !!engine?.hasUnsynced());
    setBusy(false);
  }

  return (
    <main className="lesson-shell">
      <section className="practice-card">
        <h1>Practice account</h1>
        {!configured && (
          <p>
            Account sync is unavailable on this installation. You can use every
            lesson as a guest.
          </p>
        )}
        {configured && !session && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void authenticate(false);
            }}
          >
            <p>Sign in to continue your practice across devices.</p>
            <div className="account-fields">
              <label htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="account-password">Password</label>
              <input
                id="account-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="actions">
              <button className="button primary" disabled={busy || !client}>
                Sign in
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={
                  busy || !client || !email.trim() || password.length < 6
                }
                onClick={() => void authenticate(true)}
              >
                Create account
              </button>
            </div>
          </form>
        )}
        {session && (
          <>
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            {loadError && (
              <>
                <p>
                  Account practice could not be loaded. Check the connection and
                  provider setup.
                </p>
                <button
                  type="button"
                  className="button primary"
                  onClick={retryLoad}
                >
                  Retry loading practice
                </button>
              </>
            )}
            {engine && sync.status !== "conflict" && (
              <>
                <div className="actions">
                  <Link className="button primary" href={resume}>
                    Resume last activity
                  </Link>
                </div>
                {offer && (
                  <section className="account-import">
                    <h2>Guest practice on this browser</h2>
                    {engine.hasImported(offer.receipt) && (
                      <p>
                        This browser’s guest practice is already in your
                        account.
                      </p>
                    )}
                    <p>
                      Import your guest progress, drafts, attempts and stories.
                      Your guest copy stays on this browser.
                    </p>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setMessage("");
                        try {
                          if (engine.hasImported(offer.receipt)) {
                            setMessage(
                              "This browser’s guest practice is already in your account.",
                            );
                            return;
                          }
                          await engine.importGuest(
                            offer.records,
                            offer.receipt,
                          );
                          setMessage(
                            engine.hasImported(offer.receipt)
                              ? "Guest practice added to your account."
                              : "Check the sync status or review any conflicts below.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Import guest practice
                    </button>
                  </section>
                )}
              </>
            )}
            <div className="actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void leave()}
              >
                Sign out
              </button>
              {confirmDiscard && engine?.hasUnsynced() && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void leave(true)}
                >
                  Discard unsynced changes and sign out
                </button>
              )}
            </div>
          </>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          <Link href="/practice">Activities and progress</Link>
        </p>
      </section>
    </main>
  );
}
